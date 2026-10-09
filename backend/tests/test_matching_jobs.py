from datetime import timedelta

import pytest
from sqlalchemy import func, select, text

from app.core.config import get_settings
from app.core.security import utcnow
from app.db.session import SessionLocal
from app.models import MatchingJob, MatchingNotification, MatchingResult, Notification, Product
from app.services.matching_jobs import enqueue, run_one
from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_transaction_api import key_headers, product

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "p3-jobs-test-" + "x" * 40)
    monkeypatch.setenv("MATCHING_NOTIFICATIONS_ENABLED", "true")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def drain():
    for _ in range(10000):
        if not run_one():
            with SessionLocal() as db:
                pending = list(
                    db.scalars(select(MatchingJob).where(MatchingJob.status == "PENDING"))
                )
                if not pending:
                    return
                # Advance the scheduler clock only in this isolated test process.
                for job in pending:
                    job.available_at = utcnow()
                db.commit()
    pytest.fail("Matching queue did not drain within test limit.")


def test_matching_outbox_result_notification_dedup_and_close(client):
    seller, buyer = account(client), account(client)
    item = product(client, seller)
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 50,
            "budgetMax": 50,
            "condition": "GOOD",
            "location": "Library",
            "expireAt": (utcnow() + timedelta(days=1)).isoformat(),
        },
    ).json()["data"]
    wid = wanted["id"]
    drain()
    with SessionLocal() as db:
        assert db.get(MatchingResult, wid) is not None
        assert db.get(MatchingNotification, (wid, item["id"])) is not None
        matched = db.get(MatchingNotification, (wid, item["id"]))
        assert db.get(Notification, matched.notification_id).user_id == buyer["user"]["id"]
        enqueue(db, "repeat-check", [wid])
        enqueue(db, "repeat-check", [wid])
        db.commit()
    drain()
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(MatchingJob)
                .where(MatchingJob.event_key == "repeat-check", MatchingJob.wanted_id == wid)
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(MatchingNotification)
                .where(
                    MatchingNotification.wanted_id == wid,
                    MatchingNotification.product_id == item["id"],
                )
            )
            == 1
        )
    assert (
        client.patch(
            f'/products/{item["id"]}/status', headers=headers(seller), json={"status": "HIDDEN"}
        ).status_code
        == 200
    )
    drain()
    with SessionLocal() as db:
        assert str(item["id"]) not in [
            candidate["productId"] for candidate in db.get(MatchingResult, wid).facts["items"]
        ]
    assert (
        client.patch(
            f'/products/{item["id"]}/status', headers=headers(seller), json={"status": "ON_SALE"}
        ).status_code
        == 200
    )
    drain()
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(MatchingNotification)
                .where(
                    MatchingNotification.wanted_id == wid,
                    MatchingNotification.product_id == item["id"],
                )
            )
            == 1
        )
    assert client.delete(f"/wanted/{wid}", headers=headers(buyer)).status_code == 204
    drain()
    with SessionLocal() as db:
        assert db.get(MatchingResult, wid) is None


def test_business_rollback_rolls_back_outbox(client):
    seller = account(client)
    item = product(client, seller)
    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(MatchingJob))
        entity = db.get(Product, item["id"])
        entity.price = 99
        db.flush()
        db.rollback()
    with SessionLocal() as db:
        assert db.get(Product, item["id"]).price == 50
        assert db.scalar(select(func.count()).select_from(MatchingJob)) == before


def test_stale_revision_retries_without_publishing_and_recovers(client, monkeypatch):
    from app.services import intelligence

    drain()
    buyer = account(client)
    drain()  # Registration itself queues refreshes for existing wanted posts.
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 0,
            "budgetMax": 100,
            "condition": "ANY",
            "location": "ANY",
            "expireAt": (utcnow() + timedelta(days=1)).isoformat(),
        },
    ).json()["data"]
    wid = wanted["id"]
    original = intelligence.rank_live

    def changed_snapshot(*args, **kwargs):
        result = original(*args, **kwargs)
        with SessionLocal() as concurrent:
            concurrent.execute(text("UPDATE matching_revision SET value=value+1 WHERE id=1"))
            concurrent.commit()
        return result

    with monkeypatch.context() as fault:
        fault.setattr(intelligence, "rank_live", changed_snapshot)
        assert run_one()
    with SessionLocal() as db:
        job = db.scalar(select(MatchingJob).where(MatchingJob.wanted_id == wid))
        assert job.status == "PENDING" and job.last_error == "STALE_INPUT"
        assert db.get(MatchingResult, wid) is None
        assert (
            db.scalar(
                select(func.count())
                .select_from(MatchingNotification)
                .where(MatchingNotification.wanted_id == wid)
            )
            == 0
        )
        # Test clock advancement only; never modify business facts to pass a journey.
        job.available_at = utcnow()
        db.commit()
    drain()
    with SessionLocal() as db:
        assert db.get(MatchingResult, wid) is not None


def test_claim_lock_is_skipped_by_another_worker(client):
    drain()
    buyer = account(client)
    drain()
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 0,
            "budgetMax": 100,
            "condition": "ANY",
            "location": "ANY",
            "expireAt": (utcnow() + timedelta(days=1)).isoformat(),
        },
    ).json()["data"]
    with SessionLocal() as first:
        claimed = first.scalar(
            select(MatchingJob).where(MatchingJob.wanted_id == wanted["id"]).with_for_update()
        )
        assert claimed.status == "PENDING"
        assert run_one() is False
        first.rollback()  # Same release as a process crash: no persisted partial work.
    assert run_one()
    with SessionLocal() as db:
        assert db.get(MatchingResult, wanted["id"]) is not None


def test_unexpected_failure_has_bounded_retry_and_no_partial_notification(client, monkeypatch):
    from app.services import intelligence

    drain()
    buyer = account(client)
    drain()
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 0,
            "budgetMax": 100,
            "condition": "ANY",
            "location": "ANY",
            "expireAt": (utcnow() + timedelta(days=1)).isoformat(),
        },
    ).json()["data"]

    def failure(*_args, **_kwargs):
        raise RuntimeError("fixture-private-input-not-for-logs")

    monkeypatch.setattr(intelligence, "rank_live", failure)
    for attempt in range(1, 6):
        assert run_one()
        with SessionLocal() as db:
            job = db.scalar(select(MatchingJob).where(MatchingJob.wanted_id == wanted["id"]))
            assert job.attempts == attempt and job.last_error == "WORKER_FAILURE"
            assert job.status == ("FAILED" if attempt == 5 else "PENDING")
            assert db.get(MatchingResult, wanted["id"]) is None
            job.available_at = utcnow()
            db.commit()
    assert run_one() is False
