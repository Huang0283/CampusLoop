from types import SimpleNamespace

import pytest

from scripts.seed_demo import VERSION, catalog, guard
from tests.conftest import requires_postgres


def test_demo_initializer_refuses_daily_and_production_databases(monkeypatch):
    monkeypatch.setenv("CAMPUSLOOP_DEMO_DATASET", VERSION)
    settings = SimpleNamespace(
        app_env="dev",
        database_url="postgresql://localhost/campusloop_demo",
        redis_url="redis://localhost/15",
    )
    guard(settings)
    settings.database_url = "postgresql://localhost/campusloop"
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.database_url = "postgresql://localhost/campusloop_demo"
    settings.app_env = "prod"
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.app_env = "dev"
    settings.redis_url = "redis://localhost/0"
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.redis_url = "redis://localhost/15"
    monkeypatch.delenv("CAMPUSLOOP_DEMO_DATASET")
    with pytest.raises(RuntimeError):
        guard(settings)


def test_demo_images_and_copy_are_verified():
    items = catalog()
    assert len({item["key"] for item in items}) == 25
    assert sum(len(item["images"]) for item in items) == 81
    assert len({image for item in items for image in item["images"]}) == 81
    assert sum(item["category"] == "SPORTS" for item in items) >= 6


def test_shared_demo_requires_explicit_local_import(monkeypatch):
    settings = SimpleNamespace(
        app_env="dev",
        database_url="postgresql://localhost/campusloop",
        redis_url="redis://localhost/0",
    )
    with pytest.raises(RuntimeError):
        guard(settings, into_local=True)
    monkeypatch.setenv("CAMPUSLOOP_LOCAL_DEMO_IMPORT", VERSION)
    guard(settings, into_local=True)
    for field, value in [
        ("app_env", "prod"),
        ("database_url", "postgresql://localhost/other"),
        ("redis_url", "redis://localhost/1"),
    ]:
        prior = getattr(settings, field)
        setattr(settings, field, value)
        with pytest.raises(RuntimeError):
            guard(settings, into_local=True)
        setattr(settings, field, prior)


@pytest.mark.integration
@requires_postgres
def test_shared_demo_preserves_existing_users_and_is_idempotent(monkeypatch):
    from urllib.parse import urlsplit
    from uuid import uuid4

    from sqlalchemy import func, select

    from app.core.config import get_settings
    from app.db.session import SessionLocal
    from app.models import AccountDecision, Order, Product, Report, User
    from scripts import seed_demo

    settings = get_settings()
    database = urlsplit(settings.database_url).path
    assert settings.app_env not in ("dev", "prod")
    assert database != "/campusloop" or settings.app_env == "ci"
    assert urlsplit(settings.redis_url).path in ("/14", "/15")
    monkeypatch.setattr(
        seed_demo, "storage_client", lambda: SimpleNamespace(put_object=lambda **kwargs: None)
    )
    with SessionLocal() as db:
        original = {
            user.id: (
                user.email,
                user.nickname,
                user.password_hash,
                user.avatar_url,
                user.bio,
                user.status,
            )
            for user in db.scalars(select(User))
        }
        admin = User(
            email=f"shared-admin-{uuid4().hex}@example.invalid",
            nickname="Audit admin",
            role="ADMIN",
            status="ACTIVE",
            password_hash="audit-only",
            avatar_url="preserve-avatar",
        )
        db.add(admin)
        db.flush()
        administrator = db.scalar(
            select(User)
            .where(User.role == "ADMIN", User.status == "ACTIVE")
            .order_by(User.id)
            .limit(1)
        )
        avatar = administrator.avatar_url
        result = seed_demo.initialize(db, seed_demo.catalog(), into_local=True)
        assert result["accounts"] == list(seed_demo.EMAILS[:2])
        assert administrator.avatar_url == avatar
        assert db.scalar(select(User.id).where(User.email == seed_demo.EMAILS[2])) is None
        seller, buyer = [
            db.scalar(select(User).where(User.email == email)) for email in seed_demo.EMAILS[:2]
        ]
        assert (
            db.scalar(
                select(func.count())
                .select_from(Order)
                .where(
                    Order.seller_id == seller.id,
                    Order.buyer_id == buyer.id,
                    Order.status == "COMPLETED",
                )
            )
            == 15
        )
        assert (
            db.scalar(
                select(func.count()).select_from(Report).where(Report.reporter_id == buyer.id)
            )
            == 4
        )
        assert set(
            db.scalars(
                select(AccountDecision.actor_id).where(
                    AccountDecision.user_id.in_([seller.id, buyer.id])
                )
            )
        ) == {administrator.id}
        seller.bio, seller.password_hash = "Edited profile", "changed-demo-password"
        db.flush()
        before = [
            db.scalar(select(func.count()).select_from(model))
            for model in (User, Product, Order, Report)
        ]
        assert seed_demo.initialize(db, seed_demo.catalog(), into_local=True) == {
            "alreadyInitialized": True
        }
        assert before == [
            db.scalar(select(func.count()).select_from(model))
            for model in (User, Product, Order, Report)
        ]
        assert (seller.bio, seller.password_hash) == ("Edited profile", "changed-demo-password")
        for user in db.scalars(select(User).where(User.id.in_(original))):
            assert (
                user.email,
                user.nickname,
                user.password_hash,
                user.avatar_url,
                user.bio,
                user.status,
            ) == original[user.id]
        db.rollback()
        db.add(
            User(
                email=seed_demo.EMAILS[1],
                nickname="Existing owner",
                role="USER",
                status="ACTIVE",
                password_hash="preserved-password",
            )
        )
        db.flush()
        with pytest.raises(RuntimeError, match="collision"):
            seed_demo.initialize(db, seed_demo.catalog(), into_local=True)
        assert (
            db.scalar(select(User.password_hash).where(User.email == seed_demo.EMAILS[1]))
            == "preserved-password"
        )
        assert db.scalar(select(User.id).where(User.email == seed_demo.EMAILS[0])) is None
        db.rollback()
