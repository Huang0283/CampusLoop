from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    ChatMessage,
    ChatReadCursor,
    ChatSession,
    Meetup,
    Offer,
    Order,
    Product,
    ProductImage,
    Review,
    User,
    WantedPost,
)
from app.services.serializers import public_user


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
    owner_ids = list(owners)
    ratings = dict(
        db.execute(
            select(Review.reviewee_id, func.avg(Review.rating))
            .join(Order, Review.order_id == Order.id)
            .where(Review.reviewee_id.in_(owner_ids), Order.status == "COMPLETED")
            .group_by(Review.reviewee_id)
        ).all()
    )
    counts = dict.fromkeys(owner_ids, 0)
    for buyer, seller in db.execute(
        select(Order.buyer_id, Order.seller_id).where(
            Order.status == "COMPLETED",
            (Order.buyer_id.in_(owner_ids)) | (Order.seller_id.in_(owner_ids)),
        )
    ):
        for uid in (buyer, seller):
            if uid in counts:
                counts[uid] += 1
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
            "seller": {
                "id": owner.id,
                "nickname": owner.nickname,
                "avatar": owner.avatar_url,
                "rating": round(float(ratings.get(owner.id) or 0), 1),
                "transactionCount": counts[owner.id],
            },
        }
        if entity.original_price is not None:
            data["originalPrice"] = float(entity.original_price)
        result.append(data)
    return result


def product(db: Session, entity: Product) -> dict:
    return products(db, [entity])[0]


def wanted(db: Session, entity: WantedPost) -> dict:
    requirements = entity.requirements or {}
    return {
        "id": entity.id,
        "owner": public_user(db, db.get(User, entity.owner_id)),
        "title": entity.title,
        "description": entity.description,
        "budgetMin": float(entity.budget_min or 0),
        "budgetMax": float(entity.budget_max or 0),
        "condition": requirements.get("condition", "ANY"),
        "location": requirements.get("location", "ANY"),
        "status": entity.status,
        "expireAt": iso(entity.expires_at or entity.created_at),
        "createdAt": iso(entity.created_at),
    }


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


def session(db: Session, entity, actor_id: int) -> dict:
    peer_id = entity.seller_id if entity.buyer_id == actor_id else entity.buyer_id
    cursor = db.get(ChatReadCursor, (entity.id, actor_id))
    last = db.scalar(
        select(ChatMessage)
        .where(ChatMessage.session_id == entity.id)
        .order_by(ChatMessage.id.desc())
        .limit(1)
    )
    unread = db.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.session_id == entity.id,
            ChatMessage.sender_id != actor_id,
            ChatMessage.id > (cursor.last_message_id if cursor else 0),
        )
    )
    result = {
        "id": entity.id,
        "type": entity.session_type,
        "peer": public_user(db, db.get(User, peer_id)),
        "unreadCount": unread or 0,
    }
    if entity.product_id:
        result["product"] = product(db, db.get(Product, entity.product_id))
    if entity.wanted_id:
        result["wanted"] = wanted(db, db.get(WantedPost, entity.wanted_id))
    if last:
        result["lastMessage"] = message(last)
    return result


def offer(db: Session, entity: Offer) -> dict:
    context = db.get(ChatSession, entity.session_id)
    item = db.get(Product, context.product_id)
    accepted = db.scalar(select(Order).where(Order.offer_id == entity.id))
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


def order(db: Session, entity: Order) -> dict:
    arrangement = db.scalar(select(Meetup).where(Meetup.order_id == entity.id))
    result = {
        "id": entity.id,
        "product": product(db, db.get(Product, entity.product_id)),
        "buyer": public_user(db, db.get(User, entity.buyer_id)),
        "seller": public_user(db, db.get(User, entity.seller_id)),
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
