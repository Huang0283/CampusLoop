"""Campus meeting slots use China Standard Time, independent of the API host timezone."""

from datetime import date, datetime, time, timedelta, timezone

from app.core.errors import BusinessError
from app.core.security import utcnow

CAMPUS_TIMEZONE = timezone(timedelta(hours=8))


def require_future_meetup(day: date, start: time, *, confirmation: bool = False) -> None:
    scheduled = datetime.combine(day, start, tzinfo=CAMPUS_TIMEZONE)
    if scheduled <= utcnow():
        raise BusinessError(
            409 if confirmation else 422,
            "ORDER_STATE_CONFLICT" if confirmation else "VALIDATION_ERROR",
            "见面开始时间必须晚于当前时间（北京时间），请修改见面约定。",
        )
