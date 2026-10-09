"""Authenticated WebSocket delivery; durable HTTP cursors remain authoritative.

Polling PostgreSQL provides cross-process recovery if Redis notification delivery
is unavailable. No in-memory message history or URL credentials are used.
"""

import asyncio
import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes.transactions import persist_message
from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.db.session import SessionLocal
from app.models import ChatMessage, ChatSession
from app.schemas.business import MessageWrite
from app.services.auth import authenticate
from app.services.business_serializers import message

router = APIRouter()


def authenticate_connection(token):
    with SessionLocal() as db:
        actor, _ = authenticate(db, token)
        if actor.role != "USER":
            raise BusinessError(403, "FORBIDDEN", "Student account required.")
        # HTTP catches up history; live channel starts at the handshake watermark.
        watermark = db.scalar(select(func.max(ChatMessage.id))) or 0
        return actor.id, watermark


def next_messages(token, cursor):
    with SessionLocal() as db:
        actor, _ = authenticate(db, token)
        rows = db.scalars(
            select(ChatMessage)
            .join(ChatSession, ChatSession.id == ChatMessage.session_id)
            .where(
                ChatMessage.id > cursor,
                (ChatSession.buyer_id == actor.id) | (ChatSession.seller_id == actor.id),
            )
            .order_by(ChatMessage.id)
            .limit(100)
        ).all()
        return [message(row) for row in rows]


def send_persisted(token, payload):
    if (
        not isinstance(payload, dict)
        or type(payload.get("sessionId")) is not int
        or not 0 < payload["sessionId"] <= 9007199254740991
    ):
        raise BusinessError(422, "VALIDATION_ERROR", "Session ID required.")
    session_id = payload["sessionId"]
    body = MessageWrite.model_validate(
        {key: value for key, value in payload.items() if key != "sessionId"}
    )
    with SessionLocal() as db:
        actor, _ = authenticate(db, token)
        return persist_message(db, actor, session_id, body)


def envelope(kind, payload, identity=None):
    return {
        "eventId": identity or uuid.uuid4().hex,
        "type": kind,
        "payload": payload,
        "sentAt": utcnow().isoformat(),
    }


@router.websocket("/ws")
async def websocket_endpoint(socket: WebSocket):
    origin = socket.headers.get("origin")
    if origin and origin not in get_settings().cors_origin_list or socket.query_params:
        await socket.close(code=4403)
        return
    await socket.accept()
    try:
        raw_auth = await asyncio.wait_for(socket.receive_text(), timeout=5)
        if len(raw_auth) > 8192:
            await socket.close(code=1009)
            return
        frame = json.loads(raw_auth)
        if (
            not isinstance(frame, dict)
            or frame.get("type") != "AUTH"
            or not isinstance(frame.get("accessToken"), str)
        ):
            await socket.close(code=4401)
            return
        token = frame["accessToken"]
        _, cursor = await asyncio.to_thread(authenticate_connection, token)
        await socket.send_json(envelope("AUTH_OK", {}))
        # One receive task; each interval reauthorizes before every private batch.
        pending = asyncio.create_task(socket.receive_text())
        window_start, frame_count = time.monotonic(), 0
        try:
            while True:
                done, _ = await asyncio.wait({pending}, timeout=0.5)
                if done:
                    raw = pending.result()
                    pending = asyncio.create_task(socket.receive_text())
                    if len(raw) > 8192:
                        await socket.close(code=1009)
                        return
                    try:
                        if time.monotonic() - window_start >= 60:
                            window_start, frame_count = time.monotonic(), 0
                        frame_count += 1
                        if frame_count > 120:
                            raise BusinessError(
                                429, "RATE_LIMITED", "Realtime frame rate exceeded."
                            )
                        incoming = json.loads(raw)
                        kind = incoming.get("type")
                        if kind == "PING":
                            await asyncio.to_thread(authenticate_connection, token)
                            await socket.send_json(
                                envelope("PONG", {"serverTime": utcnow().isoformat()})
                            )
                        elif kind == "SEND_MESSAGE":
                            saved = await asyncio.to_thread(
                                send_persisted, token, incoming.get("payload")
                            )
                            await socket.send_json(
                                envelope(
                                    "MESSAGE_ACK",
                                    {
                                        "sessionId": saved["sessionId"],
                                        "clientMsgId": saved["clientMsgId"],
                                        "messageId": saved["id"],
                                        "createdAt": saved["createdAt"],
                                    },
                                )
                            )
                        elif kind not in ("TYPING",):
                            raise BusinessError(
                                422,
                                "VALIDATION_ERROR",
                                "Use HTTP for read cursors and transaction operations.",
                            )
                    except (ValidationError, json.JSONDecodeError, AttributeError):
                        await socket.send_json(
                            envelope(
                                "ERROR", {"code": "VALIDATION_ERROR", "message": "Invalid frame."}
                            )
                        )
                    except BusinessError as exc:
                        if exc.status in (401, 423, 503):
                            raise
                        await socket.send_json(
                            envelope("ERROR", {"code": exc.code, "message": exc.message})
                        )
                batch = await asyncio.to_thread(next_messages, token, cursor)
                for saved in batch:
                    # Revalidate immediately before outgoing private delivery.
                    await asyncio.to_thread(authenticate_connection, token)
                    await socket.send_json(
                        envelope(
                            "MESSAGE_CREATED",
                            {"sessionId": saved["sessionId"], "message": saved},
                            f'message:{saved["id"]}',
                        )
                    )
                    cursor = saved["id"]
        finally:
            pending.cancel()
            await asyncio.gather(pending, return_exceptions=True)
    except (WebSocketDisconnect, RuntimeError):
        return
    except (TimeoutError, ValueError):
        await socket.close(code=4401)
    except BusinessError as exc:
        await socket.close(code=4423 if exc.status == 423 else 1013 if exc.status == 503 else 4401)
    except SQLAlchemyError:
        await socket.close(code=1013)
