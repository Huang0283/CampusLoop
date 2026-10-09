import pytest
from sqlalchemy import event

from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.models import ChatSession, Order, Product
from app.services import business_serializers as dto
from tests.conftest import requires_postgres
from tests.test_auth import account
from tests.test_transaction_api import pending_order

pytestmark = [pytest.mark.integration, requires_postgres]


def test_batch_serializers_query_count_does_not_grow_with_page_size(client, monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "p3-query-test-" + "x" * 40)
    get_settings.cache_clear()
    seller, buyer = account(client), account(client)
    item, sid, order = pending_order(client, seller, buyer)
    calls = []

    def record(*_):
        calls.append(1)

    with SessionLocal() as db:
        product = db.get(Product, item["id"])
        session = db.get(ChatSession, sid)
        entity = db.get(Order, order["id"])
        event.listen(engine, "before_cursor_execute", record)
        try:
            for operation, row in (
                (lambda rows: dto.products(db, rows), product),
                (lambda rows: dto.orders(db, rows), entity),
                (lambda rows: dto.sessions(db, rows, buyer["user"]["id"]), session),
            ):
                calls.clear()
                operation([row])
                one = len(calls)
                calls.clear()
                result = operation([row] * 20)
                twenty = len(calls)
                assert len(result) == 20
                assert twenty == one and twenty <= 15
        finally:
            event.remove(engine, "before_cursor_execute", record)
    get_settings.cache_clear()
