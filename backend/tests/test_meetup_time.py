from datetime import UTC, date, datetime, time

import pytest

from app.core.errors import BusinessError
from app.services import meetup_time


@pytest.mark.parametrize("start", [time(8, 59), time(9, 0)])
def test_past_or_current_start_rejected_in_campus_timezone(monkeypatch, start):
    monkeypatch.setattr(meetup_time, "utcnow", lambda: datetime(2026, 10, 15, 1, tzinfo=UTC))
    with pytest.raises(BusinessError) as caught:
        meetup_time.require_future_meetup(date(2026, 10, 15), start)
    assert caught.value.status == 422
    assert caught.value.code == "VALIDATION_ERROR"


def test_future_start_and_campus_midnight_boundary(monkeypatch):
    monkeypatch.setattr(meetup_time, "utcnow", lambda: datetime(2026, 10, 14, 16, 30, tzinfo=UTC))
    with pytest.raises(BusinessError):
        meetup_time.require_future_meetup(date(2026, 10, 14), time(23, 59))
    meetup_time.require_future_meetup(date(2026, 10, 15), time(0, 31))
    meetup_time.require_future_meetup(date(2026, 10, 16), time(0, 0))
