import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.auth import StrictInput


class ProductWrite(StrictInput):
    title: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=32)
    condition: str = Field(min_length=1, max_length=16)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    originalPrice: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    campusLocation: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=3000)
    images: list[str] = Field(min_length=1, max_length=5)

    @field_validator("price", "originalPrice", mode="before")
    @classmethod
    def money(cls, value):
        if isinstance(value, bool) or not isinstance(value, int | float | Decimal):
            raise ValueError("Numeric amount required.")
        return Decimal(str(value))

    @field_validator("title", "category", "condition", "campusLocation")
    @classmethod
    def trim(cls, value):
        if not value.strip():
            raise ValueError("Field cannot be blank.")
        return value.strip()


class ProductStatusWrite(StrictInput):
    status: Literal["ON_SALE", "HIDDEN", "RESERVED", "SOLD"]


class WantedWrite(StrictInput):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=3000)
    budgetMin: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    budgetMax: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    condition: str = Field(min_length=1, max_length=16)
    location: str = Field(min_length=1, max_length=128)
    expireAt: datetime

    @field_validator("budgetMin", "budgetMax", mode="before")
    @classmethod
    def money(cls, value):
        return ProductWrite.money(value)

    @field_validator("expireAt", mode="before")
    @classmethod
    def timestamp(cls, value):
        result = (
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, str)
            else value
        )
        if not isinstance(result, datetime) or result.tzinfo is None:
            raise ValueError("Timezone required.")
        return result

    @model_validator(mode="after")
    def ordered_budget(self):
        if self.budgetMin > self.budgetMax:
            raise ValueError("Minimum budget exceeds maximum.")
        return self


class ChatCreate(StrictInput):
    productId: int | None = Field(default=None, gt=0)
    wantedId: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def one_context(self):
        if (self.productId is None) == (self.wantedId is None):
            raise ValueError("Exactly one context is required.")
        return self


class MessageWrite(StrictInput):
    clientMsgId: str
    kind: Literal["TEXT", "IMAGE"]
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("clientMsgId")
    @classmethod
    def msg_uuid(cls, value):
        return str(uuid.UUID(value))

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be blank.")
        return value


class ReadWrite(StrictInput):
    lastMessageId: int = Field(ge=0)


class AmountWrite(StrictInput):
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)

    @field_validator("amount", mode="before")
    @classmethod
    def money(cls, value):
        return ProductWrite.money(value)


class ReasonWrite(StrictInput):
    reason: str = Field(default="", max_length=200)


class MeetupWrite(StrictInput):
    campusLocation: str = Field(min_length=1, max_length=100)
    scheduledDate: date
    timeSlotStart: time
    timeSlotEnd: time
    note: str = Field(default="", max_length=500)

    @field_validator("scheduledDate", mode="before")
    @classmethod
    def parse_date(cls, value):
        return date.fromisoformat(value) if isinstance(value, str) else value

    @field_validator("timeSlotStart", "timeSlotEnd", mode="before")
    @classmethod
    def parse_time(cls, value):
        result = time.fromisoformat(value) if isinstance(value, str) else value
        if result.tzinfo:
            raise ValueError("Local meeting time must not contain an offset.")
        return result

    @model_validator(mode="after")
    def interval(self):
        if not self.campusLocation.strip() or self.timeSlotStart >= self.timeSlotEnd:
            raise ValueError("Invalid place or interval.")
        return self


class MeetupConfirm(StrictInput):
    meetupId: int = Field(gt=0)
    version: int = Field(ge=1)


class CompleteWrite(StrictInput):
    meetupVersion: int = Field(ge=1)


class ReviewWrite(StrictInput):
    orderId: int = Field(gt=0)
    overall: int = Field(ge=1, le=5)
    descriptionAccuracy: int = Field(ge=1, le=5)
    communication: int = Field(ge=1, le=5)
    punctuality: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


class ReportWrite(StrictInput):
    targetType: Literal["USER", "PRODUCT", "ORDER", "CHAT_MESSAGE"]
    targetId: int = Field(gt=0)
    reason: Literal[
        "FAKE_PRODUCT", "DESCRIPTION_MISMATCH", "SPAM", "ABNORMAL_PRICE", "HARASSMENT", "VIOLATION"
    ]
    description: str = Field(default="", max_length=2000)
    evidence: list[str] = Field(default_factory=list, max_length=5)
