from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Response
from sqlalchemy import select, update

from app.api.routes.market import Key, Page, PageSize, page_data
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import (
    ChatMessage,
    ChatReadCursor,
    ChatSession,
    Meetup,
    Notification,
    Offer,
    Order,
    OrderEvent,
    Product,
    Report,
    Review,
    User,
    WantedPost,
)
from app.schemas.business import (
    AmountWrite,
    ChatCreate,
    CompleteWrite,
    MeetupConfirm,
    MeetupWrite,
    MessageWrite,
    ReadWrite,
    ReasonWrite,
    ReportWrite,
    ReviewWrite,
)
from app.services import business_serializers as dto
from app.services.auth import Actor, Db, student
from app.services.business import chat, event, idempotent, load, notify, order, require_participant
from app.services.storage import owned_keys

router = APIRouter(tags=["Transactions"])


@router.post("/chat/sessions", operation_id="createChatSession")
def create_session(body: ChatCreate, db: Db, actor: Actor):
    student(actor)
    if body.productId:
        target = load(db, Product, body.productId, lock=True)
        if target.deleted_at or target.status != "ON_SALE":
            raise BusinessError(409, "PRODUCT_STATE_CONFLICT", "Product is not available.")
        buyer, seller, kind = actor.id, target.owner_id, "PRODUCT"
        stmt = select(ChatSession).where(
            ChatSession.product_id == target.id,
            ChatSession.buyer_id == buyer,
            ChatSession.seller_id == seller,
        )
    else:
        target = load(db, WantedPost, body.wantedId, lock=True)
        if target.status != "OPEN" or target.expires_at and target.expires_at <= utcnow():
            raise BusinessError(409, "WANTED_STATE_CONFLICT", "Wanted post is unavailable.")
        buyer, seller, kind = target.owner_id, actor.id, "WANTED"
        stmt = select(ChatSession).where(
            ChatSession.wanted_id == target.id,
            ChatSession.buyer_id == buyer,
            ChatSession.seller_id == seller,
        )
    if buyer == seller:
        raise BusinessError(403, "FORBIDDEN", "Cannot contact your own listing.")
    if db.get(User, target.owner_id).status != "ACTIVE":
        raise BusinessError(404, "NOT_FOUND", "Resource unavailable.")
    context = db.scalar(stmt)
    if context is None:
        context = ChatSession(
            session_type=kind,
            product_id=body.productId,
            wanted_id=body.wantedId,
            buyer_id=buyer,
            seller_id=seller,
        )
        db.add(context)
        db.flush()
    result = ok(dto.session(db, context, actor.id))
    db.commit()
    return result


@router.get("/chat/sessions", operation_id="listChatSessions")
def list_sessions(db: Db, actor: Actor):
    items = db.scalars(
        select(ChatSession)
        .where((ChatSession.buyer_id == actor.id) | (ChatSession.seller_id == actor.id))
        .order_by(ChatSession.last_message_at.desc().nullslast(), ChatSession.id.desc())
        .limit(100)
    ).all()
    return ok([dto.session(db, item, actor.id) for item in items])


@router.get("/chat/sessions/{sessionId}/messages", operation_id="listMessages")
def list_messages(
    sessionId: int,
    db: Db,
    actor: Actor,
    afterId: int | None = None,
    beforeId: int | None = None,
    limit: PageSize = 30,
):
    chat(db, sessionId, actor)
    stmt = select(ChatMessage).where(ChatMessage.session_id == sessionId)
    if afterId is not None:
        if afterId < 0:
            raise BusinessError(422, "VALIDATION_ERROR", "Invalid cursor.")
        stmt = stmt.where(ChatMessage.id > afterId).order_by(ChatMessage.id)
    else:
        if beforeId is not None:
            stmt = stmt.where(ChatMessage.id < beforeId)
        stmt = stmt.order_by(ChatMessage.id.desc())
    items = db.scalars(stmt.limit(limit)).all()
    return ok([dto.message(item) for item in sorted(items, key=lambda item: item.id)])


def persist_message(db, actor, session_id: int, body: MessageWrite):
    student(actor)
    context = chat(db, session_id, actor)
    previous = db.scalar(
        select(ChatMessage).where(
            ChatMessage.sender_id == actor.id, ChatMessage.client_msg_id == body.clientMsgId
        )
    )
    if previous:
        if (
            previous.session_id != session_id
            or previous.kind != body.kind
            or previous.content != body.content
        ):
            raise BusinessError(
                409, "MESSAGE_ID_CONFLICT", "Message ID was used for another message."
            )
        return dto.message(previous)
    if body.kind == "IMAGE":
        owned_keys(db, actor, [body.content], "chat")
    item = ChatMessage(
        session_id=session_id,
        sender_id=actor.id,
        client_msg_id=body.clientMsgId,
        kind=body.kind,
        content=body.content,
    )
    db.add(item)
    context.last_message_at = utcnow()
    db.flush()
    peer = context.seller_id if actor.id == context.buyer_id else context.buyer_id
    notify(db, peer, "MESSAGE", f"/chat/{context.id}", "New message")
    result = dto.message(item)
    db.commit()
    return result


@router.post("/chat/sessions/{sessionId}/messages", status_code=201, operation_id="sendMessage")
def send_message(sessionId: int, body: MessageWrite, db: Db, actor: Actor):
    return ok(persist_message(db, actor, sessionId, body))


@router.post("/chat/sessions/{sessionId}/read", status_code=204, operation_id="markSessionRead")
def mark_session_read(sessionId: int, body: ReadWrite, db: Db, actor: Actor):
    chat(db, sessionId, actor)
    if body.lastMessageId:
        message = load(db, ChatMessage, body.lastMessageId)
        if message.session_id != sessionId:
            raise BusinessError(422, "VALIDATION_ERROR", "Read cursor is outside this session.")
    cursor = db.get(ChatReadCursor, (sessionId, actor.id))
    if cursor is None:
        db.add(
            ChatReadCursor(
                session_id=sessionId, user_id=actor.id, last_message_id=body.lastMessageId
            )
        )
    else:
        cursor.last_message_id = max(cursor.last_message_id, body.lastMessageId)
    db.commit()
    return Response(status_code=204)


def available_product(db, context):
    if not context.product_id:
        raise BusinessError(
            409, "OFFER_CONTEXT_INVALID", "Create a product conversation to make an offer."
        )
    item = load(db, Product, context.product_id, lock=True)
    if item.status != "ON_SALE" or item.deleted_at:
        raise BusinessError(409, "PRODUCT_STATE_CONFLICT", "Product is not available.")
    return item


def new_offer(db, context, actor, amount):
    entity = Offer(
        session_id=context.id,
        buyer_id=context.buyer_id,
        seller_id=context.seller_id,
        proposer_id=actor.id,
        amount=amount,
        status="PENDING",
        expires_at=utcnow() + timedelta(hours=48),
    )
    db.add(entity)
    db.flush()
    notify(
        db,
        context.seller_id if actor.id == context.buyer_id else context.buyer_id,
        "OFFER_RECEIVED",
        f"/chat/{context.id}",
        "New offer",
    )
    return entity


@router.post("/chat/sessions/{sessionId}/offers", status_code=201, operation_id="createOffer")
def create_offer(
    sessionId: int, body: AmountWrite, db: Db, actor: Actor, idempotency_key: Key = None
):
    def action():
        context = chat(db, sessionId, actor)
        available_product(db, context)
        entity = new_offer(db, context, actor, body.amount)
        return ok(dto.offer(db, entity))

    return idempotent(
        db, actor, f"offer:{sessionId}", idempotency_key, body.model_dump(mode="json"), action
    )


def pending_offer(db, identity, actor, *, creator=False):
    # Global trade lock order: authorization -> product -> offer -> order -> meetup.
    candidate = load(db, Offer, identity)
    context = load(db, ChatSession, candidate.session_id)
    require_participant(context, actor)
    available_product(db, context)
    entity = db.scalar(
        select(Offer)
        .where(Offer.id == identity)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if (entity.proposer_id == actor.id) != creator:
        raise BusinessError(403, "FORBIDDEN", "This action is not available to this participant.")
    if entity.status != "PENDING" or entity.expires_at <= utcnow():
        raise BusinessError(409, "OFFER_STATE_CONFLICT", "Offer is no longer pending.")
    return entity, context


@router.post("/offers/{offerId}/accept", operation_id="acceptOffer")
def accept_offer(offerId: int, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        entity, context = pending_offer(db, offerId, actor)
        item = db.get(Product, context.product_id)
        entity.status, entity.responded_at = "ACCEPTED", utcnow()
        item.status = "RESERVED"
        accepted = Order(
            product_id=item.id,
            offer_id=entity.id,
            buyer_id=entity.buyer_id,
            seller_id=entity.seller_id,
            amount=entity.amount,
            status="PENDING_CONFIRM",
            version=1,
        )
        db.add(accepted)
        db.flush()
        db.add(
            OrderEvent(
                order_id=accepted.id,
                operator_id=actor.id,
                from_status=None,
                to_status="PENDING_CONFIRM",
                description="Offer accepted; order created",
            )
        )
        notify(db, entity.proposer_id, "OFFER_ACCEPTED", f"/orders/{accepted.id}", "Offer accepted")
        db.flush()
        return ok({"offer": dto.offer(db, entity), "order": dto.order(db, accepted)})

    return idempotent(db, actor, f"accept:{offerId}", idempotency_key, {}, action)


@router.post("/offers/{offerId}/counter", status_code=201, operation_id="counterOffer")
def counter_offer(
    offerId: int, body: AmountWrite, db: Db, actor: Actor, idempotency_key: Key = None
):
    def action():
        entity, context = pending_offer(db, offerId, actor)
        entity.status, entity.responded_at = "COUNTERED", utcnow()
        follow = new_offer(db, context, actor, body.amount)
        entity.countered_by_offer_id = follow.id
        db.flush()
        return ok(dto.offer(db, follow))

    return idempotent(
        db, actor, f"counter:{offerId}", idempotency_key, body.model_dump(mode="json"), action
    )


@router.post("/offers/{offerId}/reject", operation_id="rejectOffer")
def reject_offer(offerId: int, db: Db, actor: Actor, body: ReasonWrite | None = None):
    student(actor)
    entity, context = pending_offer(db, offerId, actor)
    entity.status, entity.responded_at = "REJECTED", utcnow()
    notify(db, entity.proposer_id, "OFFER_REJECTED", f"/chat/{context.id}", "Offer rejected")
    db.flush()
    result = ok(dto.offer(db, entity))
    db.commit()
    return result


@router.post("/offers/{offerId}/cancel", operation_id="cancelOffer")
def cancel_offer(offerId: int, db: Db, actor: Actor):
    student(actor)
    entity, _ = pending_offer(db, offerId, actor, creator=True)
    entity.status, entity.responded_at = "CANCELLED", utcnow()
    db.flush()
    result = ok(dto.offer(db, entity))
    db.commit()
    return result


@router.get("/orders", operation_id="listOrders")
def list_orders(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    role: Literal["buyer", "seller"] | None = None,
    status: Literal[
        "PENDING_CONFIRM", "BOOKED", "MEETUP_ARRANGED", "COMPLETED", "CANCELLED", "DISPUTED"
    ]
    | None = None,
):
    stmt = select(Order).where(
        Order.buyer_id == actor.id
        if role == "buyer"
        else Order.seller_id == actor.id
        if role == "seller"
        else (Order.buyer_id == actor.id) | (Order.seller_id == actor.id)
    )
    if status:
        stmt = stmt.where(Order.status == status)
    return page_data(
        db,
        stmt.order_by(Order.id.desc()),
        page,
        pageSize,
        lambda items: [dto.order(db, item) for item in items],
    )


@router.get("/orders/{orderId}", operation_id="getOrder")
def get_order(orderId: int, db: Db, actor: Actor):
    return ok(dto.order(db, order(db, orderId, actor)))


@router.get("/orders/{orderId}/events", operation_id="listOrderEvents")
def order_events(orderId: int, db: Db, actor: Actor):
    order(db, orderId, actor)
    return ok(
        [
            {
                "id": item.id,
                "orderId": item.order_id,
                "toStatus": item.to_status,
                "description": item.description,
                "createdAt": dto.iso(item.created_at),
                **({"fromStatus": item.from_status} if item.from_status else {}),
                **({"operatorId": item.operator_id} if item.operator_id else {}),
            }
            for item in db.scalars(
                select(OrderEvent).where(OrderEvent.order_id == orderId).order_by(OrderEvent.id)
            )
        ]
    )


def writable_order(db, identity, actor):
    student(actor)
    candidate = load(db, Order, identity)
    require_participant(candidate, actor)
    load(db, Product, candidate.product_id, lock=True)
    entity = db.scalar(
        select(Order)
        .where(Order.id == identity)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return entity


@router.post("/orders/{orderId}/meetup", operation_id="saveMeetup")
def save_meetup(orderId: int, body: MeetupWrite, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        entity = writable_order(db, orderId, actor)
        if entity.status in ("COMPLETED", "CANCELLED", "DISPUTED"):
            raise BusinessError(409, "ORDER_STATE_CONFLICT", "Order is terminal.")
        arrangement = db.scalar(select(Meetup).where(Meetup.order_id == orderId).with_for_update())
        if arrangement is None:
            arrangement = Meetup(order_id=orderId, place=body.campusLocation, version=1)
            db.add(arrangement)
        else:
            arrangement.version += 1
        arrangement.place, arrangement.proposed_slots = (
            body.campusLocation,
            body.model_dump(mode="json"),
        )
        arrangement.status = "PROPOSED"
        arrangement.buyer_confirmed_version = arrangement.seller_confirmed_version = 0
        entity.buyer_confirmed_complete = entity.seller_confirmed_complete = False
        event(db, entity, actor, "Meeting proposal changed; confirmations reset", "PENDING_CONFIRM")
        db.flush()
        return ok(dto.meetup(arrangement))

    return idempotent(
        db, actor, f"meetup:{orderId}", idempotency_key, body.model_dump(mode="json"), action
    )


@router.post("/orders/{orderId}/meetup/confirm", operation_id="confirmMeetup")
def confirm_meetup(
    orderId: int, body: MeetupConfirm, db: Db, actor: Actor, idempotency_key: Key = None
):
    def action():
        entity = writable_order(db, orderId, actor)
        arrangement = db.scalar(select(Meetup).where(Meetup.order_id == orderId).with_for_update())
        if entity.status in ("COMPLETED", "CANCELLED", "DISPUTED") or not arrangement:
            raise BusinessError(409, "ORDER_STATE_CONFLICT", "Meeting cannot be confirmed.")
        if arrangement.id != body.meetupId or arrangement.version != body.version:
            raise BusinessError(
                409, "MEETUP_VERSION_CONFLICT", "Meeting proposal changed; reload it."
            )
        field = (
            "buyer_confirmed_version" if actor.id == entity.buyer_id else "seller_confirmed_version"
        )
        if getattr(arrangement, field) != arrangement.version:
            setattr(arrangement, field, arrangement.version)
            both = (
                arrangement.buyer_confirmed_version
                == arrangement.seller_confirmed_version
                == arrangement.version
            )
            if both:
                arrangement.status = "CONFIRMED"
            event(
                db, entity, actor, "Meeting version confirmed", "MEETUP_ARRANGED" if both else None
            )
        db.flush()
        return ok(dto.meetup(arrangement))

    return idempotent(
        db,
        actor,
        f"meetup-confirm:{orderId}",
        idempotency_key,
        body.model_dump(mode="json"),
        action,
    )


@router.post("/orders/{orderId}/confirm-complete", operation_id="confirmOrderComplete")
def complete_order(
    orderId: int, body: CompleteWrite, db: Db, actor: Actor, idempotency_key: Key = None
):
    def action():
        entity = writable_order(db, orderId, actor)
        arrangement = db.scalar(select(Meetup).where(Meetup.order_id == orderId).with_for_update())
        if entity.status not in ("MEETUP_ARRANGED", "COMPLETED") or not arrangement:
            raise BusinessError(
                409, "ORDER_STATE_CONFLICT", "Both participants must confirm the meeting first."
            )
        if (
            body.meetupVersion != arrangement.version
            or arrangement.buyer_confirmed_version != arrangement.version
            or arrangement.seller_confirmed_version != arrangement.version
        ):
            raise BusinessError(
                409, "MEETUP_VERSION_CONFLICT", "Meeting version is not confirmed by both parties."
            )
        field = (
            "buyer_confirmed_complete"
            if actor.id == entity.buyer_id
            else "seller_confirmed_complete"
        )
        if not getattr(entity, field):
            setattr(entity, field, True)
            both = entity.buyer_confirmed_complete and entity.seller_confirmed_complete
            if both:
                arrangement.status = "COMPLETED"
                db.get(Product, entity.product_id).status = "SOLD"
                notify(
                    db,
                    entity.buyer_id,
                    "REVIEW_REQUEST",
                    f"/orders/{entity.id}/review",
                    "Review this completed transaction",
                )
                notify(
                    db,
                    entity.seller_id,
                    "REVIEW_REQUEST",
                    f"/orders/{entity.id}/review",
                    "Review this completed transaction",
                )
            event(db, entity, actor, "Completion confirmed", "COMPLETED" if both else None)
        db.flush()
        return ok({"order": dto.order(db, entity), "completed": entity.status == "COMPLETED"})

    return idempotent(
        db, actor, f"complete:{orderId}", idempotency_key, body.model_dump(mode="json"), action
    )


@router.post("/orders/{orderId}/cancel", operation_id="cancelOrder")
def cancel_order(orderId: int, body: ReasonWrite, db: Db, actor: Actor):
    entity = writable_order(db, orderId, actor)
    if not body.reason.strip():
        raise BusinessError(422, "VALIDATION_ERROR", "Cancellation reason required.")
    if (
        entity.status in ("COMPLETED", "CANCELLED", "DISPUTED")
        or entity.buyer_confirmed_complete
        or entity.seller_confirmed_complete
    ):
        raise BusinessError(409, "ORDER_STATE_CONFLICT", "Order cannot be cancelled.")
    entity.cancelled_reason = body.reason
    db.get(Product, entity.product_id).status = "ON_SALE"
    arrangement = db.scalar(select(Meetup).where(Meetup.order_id == orderId).with_for_update())
    if arrangement:
        arrangement.status = "CANCELLED"
    event(db, entity, actor, "Order cancelled", "CANCELLED")
    db.flush()
    result = ok(dto.order(db, entity))
    db.commit()
    return result


@router.post("/reviews", status_code=201, operation_id="createReview")
def create_review(body: ReviewWrite, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        entity = writable_order(db, body.orderId, actor)
        if entity.status != "COMPLETED":
            raise BusinessError(
                409, "REVIEW_NOT_ELIGIBLE", "Only completed orders can be reviewed."
            )
        if db.scalar(
            select(Review).where(Review.order_id == entity.id, Review.reviewer_id == actor.id)
        ):
            raise BusinessError(409, "REVIEW_DUPLICATED", "This order was already reviewed.")
        peer = entity.seller_id if actor.id == entity.buyer_id else entity.buyer_id
        review = Review(
            order_id=entity.id,
            reviewer_id=actor.id,
            reviewee_id=peer,
            rating=body.overall,
            description_accuracy=body.descriptionAccuracy,
            communication=body.communication,
            punctuality=body.punctuality,
            comment=body.comment,
        )
        db.add(review)
        db.flush()
        return ok(
            {
                **body.model_dump(),
                "id": review.id,
                "reviewerId": actor.id,
                "revieweeId": peer,
                "createdAt": dto.iso(review.created_at),
            }
        )

    return idempotent(db, actor, "review", idempotency_key, body.model_dump(mode="json"), action)


def report_dto(entity):
    return {
        "id": entity.id,
        "targetType": entity.target_type,
        "targetId": entity.target_id,
        "reason": entity.reason,
        "description": entity.description or "",
        "status": entity.status,
        "createdAt": dto.iso(entity.created_at),
    }


@router.post("/reports", status_code=201, operation_id="createReport")
def create_report(body: ReportWrite, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        model = {"USER": User, "PRODUCT": Product, "ORDER": Order, "CHAT_MESSAGE": ChatMessage}[
            body.targetType
        ]
        target = load(db, model, body.targetId)
        if body.targetType == "ORDER":
            require_participant(target, actor)
        elif body.targetType == "CHAT_MESSAGE":
            chat(db, target.session_id, actor)
        elif body.targetType == "PRODUCT" and (target.deleted_at or target.status == "HIDDEN"):
            raise BusinessError(404, "NOT_FOUND", "Product not found.")
        if db.scalar(
            select(Report).where(
                Report.reporter_id == actor.id,
                Report.target_type == body.targetType,
                Report.target_id == body.targetId,
                Report.reason == body.reason,
            )
        ):
            raise BusinessError(
                409, "REPORT_DUPLICATED", "This target was already reported for this reason."
            )
        keys = owned_keys(db, actor, body.evidence, "evidence")
        entity = Report(
            reporter_id=actor.id,
            target_type=body.targetType,
            target_id=body.targetId,
            reason=body.reason,
            description=body.description,
            evidence={"keys": keys},
            status="PENDING",
        )
        db.add(entity)
        db.flush()
        return ok(report_dto(entity))

    return idempotent(db, actor, "report", idempotency_key, body.model_dump(mode="json"), action)


@router.get("/reports/mine", operation_id="listMyReports")
def my_reports(db: Db, actor: Actor):
    return ok(
        [
            report_dto(entity)
            for entity in db.scalars(
                select(Report)
                .where(Report.reporter_id == actor.id)
                .order_by(Report.id.desc())
                .limit(100)
            )
        ]
    )


@router.get("/notifications", operation_id="listNotifications")
def notifications(db: Db, actor: Actor):
    return ok(
        [
            {
                "id": entity.id,
                "type": entity.type,
                "title": (entity.payload or {}).get("title", entity.type),
                "content": (entity.payload or {}).get("content", ""),
                "link": (entity.payload or {}).get("link", "/orders"),
                "read": entity.read_at is not None,
                "createdAt": dto.iso(entity.created_at),
            }
            for entity in db.scalars(
                select(Notification)
                .where(Notification.user_id == actor.id)
                .order_by(Notification.id.desc())
                .limit(100)
            )
        ]
    )


@router.post("/notifications/read-all", status_code=204, operation_id="markAllNotificationsRead")
def notifications_read_all(db: Db, actor: Actor):
    db.execute(
        update(Notification)
        .where(Notification.user_id == actor.id, Notification.read_at.is_(None))
        .values(read_at=utcnow())
    )
    db.commit()
    return Response(status_code=204)


@router.post(
    "/notifications/{notificationId}/read", status_code=204, operation_id="markNotificationRead"
)
def notification_read(notificationId: int, db: Db, actor: Actor):
    entity = db.scalar(
        select(Notification)
        .where(Notification.id == notificationId, Notification.user_id == actor.id)
        .with_for_update()
    )
    if entity is None:
        raise BusinessError(404, "NOT_FOUND", "Notification not found.")
    if entity.read_at is None:
        entity.read_at = utcnow()
    db.commit()
    return Response(status_code=204)
