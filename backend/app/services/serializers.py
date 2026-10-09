from sqlalchemy import func, select, union_all
from sqlalchemy.orm import Session

from app.models import Order, Review, User


def public_users(db: Session, users: list[User]) -> dict[int, dict]:
    if not users:
        return {}
    ids = {user.id for user in users}
    ratings = dict(
        db.execute(
            select(Review.reviewee_id, func.avg(Review.rating))
            .join(Order, Review.order_id == Order.id)
            .where(Review.reviewee_id.in_(ids), Order.status == "COMPLETED")
            .group_by(Review.reviewee_id)
        ).all()
    )
    completed = union_all(
        select(Order.buyer_id.label("user_id")).where(
            Order.status == "COMPLETED", Order.buyer_id.in_(ids)
        ),
        select(Order.seller_id.label("user_id")).where(
            Order.status == "COMPLETED", Order.seller_id.in_(ids)
        ),
    ).subquery()
    counts = dict(
        db.execute(select(completed.c.user_id, func.count()).group_by(completed.c.user_id)).all()
    )
    return {
        user.id: {
            "id": user.id,
            "nickname": user.nickname,
            "avatar": user.avatar_url,
            "rating": round(float(ratings.get(user.id) or 0), 1),
            "transactionCount": counts.get(user.id, 0),
        }
        for user in users
    }


def public_user(db: Session, user: User) -> dict:
    return public_users(db, [user])[user.id]


def private_users(db: Session, users: list[User]) -> list[dict]:
    summaries = public_users(db, users)
    return [private_fields(user, summaries[user.id]) for user in users]


def private_fields(user, data):
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


def private_user(db: Session, user: User) -> dict:
    data = public_user(db, user)
    return private_fields(user, data)
