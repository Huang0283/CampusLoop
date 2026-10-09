from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import utcnow
from app.models import (
    ChatMessage,
    ChatReadCursor,
    ChatSession,
    Meetup,
    Offer,
    Order,
    Product,
    ProductImage,
    User,
    WantedPost,
)
from app.services.serializers import public_users


def iso(value):
    return value.isoformat() if value else None


def products(db: Session, entities: list[Product]) -> list[dict]:
    if not entities:
        return []
    ids = [entity.id for entity in entities]
    owners = {
        user.id: user
        for user in db.scalars(select(User).where(User.id.in_({p.owner_id for p in entities})))
    }
    summaries = public_users(db, list(owners.values()))
    images = {identity: [] for identity in ids}
    base = get_settings().s3_public_base_url.rstrip("/")
    for image in db.scalars(
        select(ProductImage)
        .where(ProductImage.product_id.in_(ids))
        .order_by(ProductImage.sort_order)
    ):
        images[image.product_id].append(base + "/" + image.object_key)
    result = []
    for entity in entities:
        owner = owners[entity.owner_id]
        data = {
            "id": entity.id,
            "title": entity.title,
            "description": entity.description,
            "category": entity.category,
            "condition": entity.condition,
            "price": float(entity.price),
            "campusLocation": entity.campus_location,
            "status": entity.status,
            "images": images[entity.id],
            "createdAt": iso(entity.created_at),
            "updatedAt": iso(entity.updated_at or entity.created_at),
            "seller": summaries[owner.id],
        }
        if entity.original_price is not None:
            data["originalPrice"] = float(entity.original_price)
        result.append(data)
    return result


def product(db: Session, entity: Product) -> dict:
    return products(db, [entity])[0]


def wanteds(db: Session, entities: list[WantedPost]) -> list[dict]:
    if not entities:
        return []
    owners = db.scalars(select(User).where(User.id.in_({item.owner_id for item in entities}))).all()
    summaries = public_users(db, owners)
    return [wanted_fields(entity, summaries[entity.owner_id]) for entity in entities]


def wanted_fields(entity, owner):
    requirements = entity.requirements or {}
    return {
        "id": entity.id,
        "owner": owner,
        "title": entity.title,
        "description": entity.description,
        "budgetMin": float(entity.budget_min or 0),
        "budgetMax": float(entity.budget_max or 0),
        "condition": requirements.get("condition", "ANY"),
        "location": requirements.get("location", "ANY"),
        "status": "EXPIRED"
        if entity.status == "OPEN" and entity.expires_at and entity.expires_at <= utcnow()
        else entity.status,
        "expireAt": iso(entity.expires_at or entity.created_at),
        "createdAt": iso(entity.created_at),
    }


def wanted(db: Session, entity: WantedPost) -> dict:
    return wanteds(db, [entity])[0]


def message(entity: ChatMessage) -> dict:
    return {
        "id": entity.id,
        "clientMsgId": entity.client_msg_id,
        "sessionId": entity.session_id,
        "senderId": entity.sender_id,
        "kind": entity.kind,
        "content": entity.content or "",
        "createdAt": iso(entity.created_at),
    }


def sessions(db: Session, entities: list[ChatSession], actor_id: int) -> list[dict]:
    if not entities:
        return []
    ids = [entity.id for entity in entities]
    peers = public_users(
        db,
        db.scalars(
            select(User).where(
                User.id.in_(
                    {
                        entity.seller_id if entity.buyer_id == actor_id else entity.buyer_id
                        for entity in entities
                    }
                )
            )
        ).all(),
    )
    items = {
        item["id"]: item
        for item in products(
            db,
            db.scalars(
                select(Product).where(
                    Product.id.in_({entity.product_id for entity in entities if entity.product_id})
                )
            ).all(),
        )
    }
    posts = {
        item["id"]: item
        for item in wanteds(
            db,
            db.scalars(
                select(WantedPost).where(
                    WantedPost.id.in_({entity.wanted_id for entity in entities if entity.wanted_id})
                )
            ).all(),
        )
    }
    latest_ids = (
        select(func.max(ChatMessage.id))
        .where(ChatMessage.session_id.in_(ids))
        .group_by(ChatMessage.session_id)
    )
    latest = {
        item.session_id: item
        for item in db.scalars(select(ChatMessage).where(ChatMessage.id.in_(latest_ids)))
    }
    unread = dict(
        db.execute(
            select(ChatMessage.session_id, func.count())
            .outerjoin(
                ChatReadCursor,
                (ChatReadCursor.session_id == ChatMessage.session_id)
                & (ChatReadCursor.user_id == actor_id),
            )
            .where(
                ChatMessage.session_id.in_(ids),
                ChatMessage.sender_id != actor_id,
                ChatMessage.id > func.coalesce(ChatReadCursor.last_message_id, 0),
            )
            .group_by(ChatMessage.session_id)
        ).all()
    )
    result = []
    for entity in entities:
        peer = entity.seller_id if entity.buyer_id == actor_id else entity.buyer_id
        data = {
            "id": entity.id,
            "type": entity.session_type,
            "peer": peers[peer],
            "unreadCount": unread.get(entity.id, 0),
        }
        if entity.product_id:
            data["product"] = items[entity.product_id]
        if entity.wanted_id:
            data["wanted"] = posts[entity.wanted_id]
        if entity.id in latest:
            data["lastMessage"] = message(latest[entity.id])
        result.append(data)
    return result


def session(db: Session, entity, actor_id: int) -> dict:
    return sessions(db, [entity], actor_id)[0]


def offers(db: Session, entities: list[Offer]) -> list[dict]:
    if not entities:
        return []
    contexts = {
        item.id: item
        for item in db.scalars(
            select(ChatSession).where(
                ChatSession.id.in_({entity.session_id for entity in entities})
            )
        )
    }
    items = {
        item.id: item
        for item in db.scalars(
            select(Product).where(Product.id.in_({item.product_id for item in contexts.values()}))
        )
    }
    accepted = {
        item.offer_id: item
        for item in db.scalars(
            select(Order).where(Order.offer_id.in_({entity.id for entity in entities}))
        )
    }
    return [
        offer_fields(entity, items[contexts[entity.session_id].product_id], accepted.get(entity.id))
        for entity in entities
    ]


def offer_fields(entity, item, accepted):
    result = {
        "id": entity.id,
        "sessionId": entity.session_id,
        "buyerId": entity.buyer_id,
        "sellerId": entity.seller_id,
        "proposerId": entity.proposer_id,
        "productId": item.id,
        "originalPrice": float(item.price),
        "amount": float(entity.amount),
        "status": entity.status,
        "expireAt": iso(entity.expires_at),
        "createdAt": iso(entity.created_at),
    }
    if accepted:
        result["orderId"] = accepted.id
    if entity.countered_by_offer_id:
        result["counteredByOfferId"] = entity.countered_by_offer_id
    return result


def offer(db: Session, entity: Offer) -> dict:
    return offers(db, [entity])[0]


def meetup(entity: Meetup) -> dict:
    slots = entity.proposed_slots or {}
    return {
        "id": entity.id,
        "orderId": entity.order_id,
        "version": entity.version,
        "campusLocation": entity.place,
        "scheduledDate": slots.get("scheduledDate", ""),
        "timeSlotStart": slots.get("timeSlotStart", ""),
        "timeSlotEnd": slots.get("timeSlotEnd", ""),
        "note": slots.get("note", ""),
        "buyerConfirmed": entity.buyer_confirmed_version == entity.version,
        "sellerConfirmed": entity.seller_confirmed_version == entity.version,
        "createdAt": iso(entity.created_at),
    }


def orders(db: Session, entities: list[Order]) -> list[dict]:
    if not entities:
        return []
    arrangements = {
        item.order_id: item
        for item in db.scalars(
            select(Meetup).where(Meetup.order_id.in_({entity.id for entity in entities}))
        )
    }
    items = {
        item["id"]: item
        for item in products(
            db,
            db.scalars(
                select(Product).where(Product.id.in_({entity.product_id for entity in entities}))
            ).all(),
        )
    }
    users = public_users(
        db,
        db.scalars(
            select(User).where(
                User.id.in_(
                    {uid for entity in entities for uid in (entity.buyer_id, entity.seller_id)}
                )
            )
        ).all(),
    )
    return [
        order_fields(entity, items[entity.product_id], users, arrangements.get(entity.id))
        for entity in entities
    ]


def order_fields(entity, item, users, arrangement):
    result = {
        "id": entity.id,
        "product": item,
        "buyer": users[entity.buyer_id],
        "seller": users[entity.seller_id],
        "status": entity.status,
        "amount": float(entity.amount),
        "buyerConfirmedComplete": entity.buyer_confirmed_complete,
        "sellerConfirmedComplete": entity.seller_confirmed_complete,
        "createdAt": iso(entity.created_at),
        "updatedAt": iso(entity.updated_at or entity.created_at),
    }
    if arrangement:
        result["meetup"] = meetup(arrangement)
    return result


def order(db: Session, entity: Order) -> dict:
    return orders(db, [entity])[0]
