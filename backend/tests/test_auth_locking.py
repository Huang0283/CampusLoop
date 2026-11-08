"""Real PostgreSQL regression for authentication locks and peer notifications."""

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import insert, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app.core.config import get_settings
from app.core.security import issue_pair, token_digest, utcnow
from app.db.base import Base
from app.db.session import engine
from app.models import AuthSessionFamily, Notification, User
from app.services.auth import authenticate, browser_session, cookie_options
from app.services.business import notify
from tests.conftest import requires_postgres

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def isolated_rate_limits():
    # These tests call database authorization directly and never use a Redis limiter.
    yield


@pytest.fixture
def auth_database(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "m6-lock-regression-" + "x" * 40)
    get_settings.cache_clear()
    schema = "m6_auth_lock_" + uuid.uuid4().hex
    tables = [User.__table__, AuthSessionFamily.__table__, Notification.__table__]
    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        Base.metadata.create_all(
            connection.execution_options(schema_translate_map={None: schema}), tables=tables
        )
    sessions = sessionmaker(
        bind=engine.execution_options(schema_translate_map={None: schema}),
        autoflush=False,
        expire_on_commit=False,
    )
    credentials = []
    try:
        with sessions.begin() as db:
            for number in range(2):
                # Core inserts avoid unrelated ORM matching-outbox listeners during setup.
                user_id = db.scalar(
                    insert(User)
                    .values(
                        email=f"lock-{number}@example.invalid",
                        password_hash="not-used-by-this-test",
                        nickname="Lock regression",
                    )
                    .returning(User.id)
                )
                browser_token = uuid.uuid4().hex * 2
                family_id = str(uuid.uuid4())
                deadline = utcnow() + timedelta(hours=1)
                db.execute(
                    insert(AuthSessionFamily).values(
                        id=family_id,
                        user_id=user_id,
                        expires_at=deadline,
                        browser_token_hash=token_digest(browser_token),
                    )
                )
                credentials.append(
                    (
                        user_id,
                        issue_pair(user_id, family_id, deadline)["accessToken"],
                        browser_token,
                    )
                )
        yield sessions, credentials
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        get_settings.cache_clear()


def authorize(db, credential, mode):
    if mode == "bearer":
        return authenticate(db, credential[1])
    request = Request(
        {
            "type": "http",
            "headers": [
                (b"origin", get_settings().cors_origin_list[0].encode()),
                (b"x-campusloop-browser", b"1"),
                (b"cookie", f'{cookie_options()["key"]}={credential[2]}'.encode()),
            ],
        }
    )
    return browser_session(db, request)


@pytest.mark.parametrize("mode", ["bearer", "browser"])
def test_authenticated_peers_can_notify_each_other_without_deadlock(auth_database, mode):
    sessions, credentials = auth_database
    barrier = threading.Barrier(2)

    def send(index):
        with sessions.begin() as db:
            db.execute(text("SET LOCAL lock_timeout = '4s'"))
            authorize(db, credentials[index], mode)
            barrier.wait(timeout=10)
            notify(db, credentials[1 - index][0], "ORDER_STATUS_CHANGED", "/orders/1", "Confirmed")
            db.flush()

    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(send, range(2)))
    with sessions() as db:
        notifications = db.scalars(select(Notification)).all()
        assert sorted(row.user_id for row in notifications) == sorted(c[0] for c in credentials)


@pytest.mark.parametrize("mode", ["bearer", "browser"])
def test_authorization_still_serializes_same_actor(auth_database, mode):
    sessions, credentials = auth_database
    with sessions.begin() as first:
        authorize(first, credentials[0], mode)
        with sessions.begin() as second:
            second.execute(text("SET LOCAL lock_timeout = '200ms'"))
            with pytest.raises(OperationalError) as failure:
                authorize(second, credentials[0], mode)
            assert failure.value.orig.sqlstate == "55P03"
            second.rollback()
    with sessions.begin() as next_request:
        user, _ = authorize(next_request, credentials[0], mode)
        assert user.id == credentials[0][0]
