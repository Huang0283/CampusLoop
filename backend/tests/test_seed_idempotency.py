"""种子数据幂等性集成测试（BP2-08 验收证据）。

验收口径：`python scripts/seed.py --check` 连跑两遍结果一致；
本测试在真实 PostgreSQL 上直接执行同样逻辑（CI 提供 service 容器）。
"""

from __future__ import annotations

import pytest

from tests.conftest import requires_postgres


@requires_postgres
@pytest.mark.integration
class TestSeedIdempotency:
    def test_duplicate_upsert_reports_zero_insertions(self) -> None:
        from app.db.session import session_scope
        from app.models import User
        from scripts.seed import seed_users, upsert

        with session_scope() as session:
            assert upsert(session, User, seed_users()) >= 0
            assert upsert(session, User, seed_users()) == 0

    def test_seed_twice_produces_identical_counts(self) -> None:
        from app.db.session import session_scope
        from scripts.seed import run_seed, snapshot_counts

        with session_scope() as session:
            run_seed(session, verbose=False)
            first = snapshot_counts(session)
            run_seed(session, verbose=False)
            second = snapshot_counts(session)

        assert first == second
        assert first["users"] >= 4
        assert first["products"] >= 6
        assert first["orders"] >= 2

    def test_seed_rows_are_labeled_demo(self) -> None:
        """种子邮箱全部使用 example.com 演示域，防止混入真实个人信息。"""
        from sqlalchemy import select

        from app.db.session import session_scope
        from app.models import User

        with session_scope() as session:
            seeded_emails = session.scalars(select(User.email).where(User.id >= 1000)).all()
        assert seeded_emails, "种子用户缺失"
        for email in seeded_emails:
            assert email.endswith("@example.com"), f"非演示邮箱混入种子数据: {email}"
