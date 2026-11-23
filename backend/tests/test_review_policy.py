from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from app.core.errors import BusinessError
from app.services.moderation import require_independent_reviewer


@pytest.mark.parametrize(
    "environment,enabled,other,allowed",
    [
        ("prod", True, None, False),
        ("dev", False, None, False),
        ("dev", True, 2, False),
        ("dev", True, None, True),
    ],
)
def test_only_explicit_single_admin_local_demo_allows_self_review(
    environment, enabled, other, allowed
):
    db = Mock()
    db.scalar.return_value = other
    settings = SimpleNamespace(app_env=environment, allow_single_admin_review=enabled)
    decision = SimpleNamespace(actor_id=1, user_id=8, id=9)
    with patch("app.services.moderation.get_settings", return_value=settings):
        if allowed:
            require_independent_reviewer(db, decision, SimpleNamespace(id=1))
            assert db.add.call_args.args[0].event == "admin_single_reviewer_exception"
        else:
            with pytest.raises(BusinessError) as error:
                require_independent_reviewer(db, decision, SimpleNamespace(id=1))
            assert error.value.code == "INDEPENDENT_REVIEW_REQUIRED"
            db.add.assert_not_called()


def test_another_reviewer_does_not_need_the_local_exception():
    db = Mock()
    require_independent_reviewer(db, SimpleNamespace(actor_id=1), SimpleNamespace(id=2))
    db.scalar.assert_not_called()
