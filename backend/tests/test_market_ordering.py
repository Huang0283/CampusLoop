"""Recommendation ranks categories before pagination, without hiding listings."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.db.session import SessionLocal
from app.models import Product
from tests.conftest import requires_postgres
from tests.test_auth import account

pytestmark = [pytest.mark.integration, requires_postgres]


def test_recommended_pagination_keeps_other_listings_and_explicit_sorts(client):
    seller = account(client)
    marker = str(uuid.uuid4())
    now = datetime.now(UTC)
    with SessionLocal.begin() as db:
        items = []
        for index, category in enumerate(["BOOKS", "DIGITAL", "other", "OTHER"]):
            item = Product(
                owner_id=seller["user"]["id"],
                title=f"{marker}-{index}",
                description="Ordering regression",
                category=category,
                condition="GOOD",
                price=40 - index * 10,
                campus_location="Campus",
                status="ON_SALE",
                created_at=now + timedelta(seconds=index),
            )
            db.add(item)
            items.append(item)
        db.flush()
        ids = [item.id for item in items]

    def listing(**params):
        response = client.get("/products", params={"query": marker, **params})
        assert response.status_code == 200, response.text
        return response.json()["data"]

    first = listing(sort="recommended", pageSize=2)
    second = listing(sort="recommended", pageSize=2, page=2)
    assert [item["id"] for item in first["items"]] == [ids[1], ids[0]]
    assert [item["id"] for item in second["items"]] == [ids[3], ids[2]]
    assert first["pagination"]["total"] == second["pagination"]["total"] == 4
    for sort in ["newest", "price_asc"]:
        assert [item["id"] for item in listing(sort=sort)["items"]] == ids[::-1]
    assert [item["id"] for item in listing(sort="price_desc")["items"]] == ids
    assert [item["id"] for item in listing(sort="recommended", category="other")["items"]] == [
        ids[2]
    ]
