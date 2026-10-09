from collections.abc import Iterator

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.db.session import SessionLocal


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        try:
            yield db
        except SQLAlchemyError:
            db.rollback()
            raise BusinessError(503, "SERVICE_UNAVAILABLE", "Database unavailable.") from None
