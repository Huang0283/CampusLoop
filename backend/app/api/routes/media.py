from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Response
from sqlalchemy import select

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.models import ChatMessage, ChatSession, Report, UploadedObject
from app.services.auth import Actor, Db, administrator, audit
from app.services.storage import storage_client

router = APIRouter(tags=["Media"])


def image_response(key):
    try:
        stream = storage_client().get_object(Bucket=get_settings().minio_private_bucket, Key=key)[
            "Body"
        ]
        try:
            content = stream.read()
        finally:
            stream.close()
    except (BotoCoreError, ClientError):
        raise BusinessError(
            503, "STORAGE_UNAVAILABLE", "Private image storage unavailable."
        ) from None
    return Response(
        content,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/chat/messages/{messageId}/image", operation_id="getChatMessageImage")
def chat_image(messageId: int, db: Db, actor: Actor):
    entity = db.scalar(
        select(ChatMessage)
        .join(ChatSession, ChatSession.id == ChatMessage.session_id)
        .where(
            ChatMessage.id == messageId,
            ChatMessage.kind == "IMAGE",
            (ChatSession.buyer_id == actor.id) | (ChatSession.seller_id == actor.id),
        )
    )
    if entity is None:
        raise BusinessError(404, "NOT_FOUND", "Private image not found.")
    prefix = "https://private.campusloop.invalid/"
    if not (entity.content or "").startswith(prefix):
        raise BusinessError(404, "NOT_FOUND", "Private image not found.")
    key = entity.content[len(prefix) :]
    if not db.scalar(
        select(UploadedObject.id).where(
            UploadedObject.object_key == key,
            UploadedObject.purpose == "chat",
            UploadedObject.owner_id == entity.sender_id,
        )
    ):
        raise BusinessError(404, "NOT_FOUND", "Private image not found.")
    return image_response(key)


@router.get("/admin/reports/{reportId}/evidence/{imageIndex}", operation_id="getReportEvidence")
def report_evidence(reportId: int, imageIndex: int, db: Db, actor: Actor):
    administrator(actor)
    report = db.get(Report, reportId)
    keys = (report.evidence or {}).get("keys", []) if report else []
    if imageIndex < 0 or imageIndex >= len(keys):
        raise BusinessError(404, "NOT_FOUND", "Evidence not found.")
    response = image_response(keys[imageIndex])
    # Target identifies the reviewed report, not the reported person; no evidence content in audit.
    audit(
        db,
        "admin_report_evidence_read",
        actor.id,
        context={"reportId": reportId, "imageIndex": imageIndex},
    )
    db.commit()
    return response
