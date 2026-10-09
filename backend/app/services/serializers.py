from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order, Review, User


def public_user(db: Session, user: User) -> dict:
    # Authoritative aggregates exclude cancelled/disputed/unfinished transactions.
    rating = db.scalar(
        select(func.avg(Review.rating))
        .join(Order, Review.order_id == Order.id)
        .where(Review.reviewee_id == user.id, Order.status == "COMPLETED")
    )
    completed = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(
            Order.status == "COMPLETED", (Order.buyer_id == user.id) | (Order.seller_id == user.id)
        )
    )
    return {
        "id": user.id,
        "nickname": user.nickname,
        "avatar": user.avatar_url,
        "rating": round(float(rating or 0), 1),
        "transactionCount": completed or 0,
    }


def private_user(db: Session, user: User) -> dict:
    data = public_user(db, user)
    return {
        **data,
        "role": user.role,
        "status": user.status,
        "email": user.email,
        "campusVerified": user.campus_email_verified,
        "bio": user.bio,
        "school": user.school,
        "college": user.college,
        "major": user.major,
        "tradeCount": data["transactionCount"],
        "creditLevel": None,
    }
