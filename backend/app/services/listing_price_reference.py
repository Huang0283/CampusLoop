"""Price references from currently visible marketplace listings, not transactions."""

from datetime import timedelta

from sqlalchemy import select

from app.core.security import utcnow
from app.models import Product, User


def listing_price_reference(db, *, category, condition, keyword, user_id):
    keyword = keyword.strip()
    if len(keyword) < 2:
        return None
    rows = db.execute(
        select(Product.id, Product.title, Product.price)
        .join(User, User.id == Product.owner_id)
        .where(
            Product.category == category,
            Product.condition == condition,
            Product.title.icontains(keyword, autoescape=True),
            Product.created_at >= utcnow() - timedelta(days=90),
            Product.status == "ON_SALE",
            Product.deleted_at.is_(None),
            Product.moderation_blocked.is_(False),
            Product.price > 0,
            User.status == "ACTIVE",
            Product.owner_id != user_id,
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(100)
    ).all()
    prices = sorted(row.price for row in rows)
    count = len(prices)
    # Discrete quartiles: real listing prices, without inventing intermediate offers.
    lower = prices[(count + 3) // 4 - 1] if count >= 3 else None
    upper = prices[(3 * count + 3) // 4 - 1] if count >= 3 else None
    return {
        "count": count,
        "lower": float(lower) if lower is not None else None,
        "upper": float(upper) if upper is not None else None,
        "listings": [{"id": row.id, "title": row.title, "price": float(row.price)} for row in rows[:5]],
    }
