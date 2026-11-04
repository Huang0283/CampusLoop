from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, Field, field_validator

from app.core.security import utcnow
from app.schemas.auth import StrictInput


class DecisionWrite(StrictInput):
    action: Literal["WARNING", "DISABLE"]
    reason: str = Field(min_length=1, max_length=500, pattern=r"\S")
    facts: str = Field(min_length=1, max_length=2000, pattern=r"\S")
    basis: str = Field(min_length=1, max_length=500, pattern=r"\S")
    occurredAt: AwareDatetime
    productId: int | None = Field(default=None, gt=0, le=9007199254740991)
    evidence: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("occurredAt", mode="before")
    @classmethod
    def parse_time(cls, value):
        return (
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, str)
            else value
        )

    @field_validator("occurredAt")
    @classmethod
    def not_future(cls, value):
        if value > utcnow():
            raise ValueError("Incident time cannot be in the future.")
        return value


class AppealWrite(StrictInput):
    explanation: str = Field(min_length=1, max_length=2000, pattern=r"\S")
    evidence: list[str] = Field(default_factory=list, max_length=5)


class AppealReview(StrictInput):
    outcome: Literal["UPHELD", "REVOKED"]
    reason: str = Field(min_length=1, max_length=1000, pattern=r"\S")
