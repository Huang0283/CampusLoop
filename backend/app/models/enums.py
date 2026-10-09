"""业务枚举（BP2-07）。

值与 openapi/campusloop.v1.yaml 中 components/schemas/*Status、*Type、Role 等
枚举完全一致；数据库层用 VARCHAR + CHECK 双重保证。
任何改动必须先改 OpenAPI（由 M6 重新生成 SDK），再同步这里。
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class ProductStatus(StrEnum):
    ON_SALE = "ON_SALE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    HIDDEN = "HIDDEN"


class WantedStatus(StrEnum):
    OPEN = "OPEN"
    MATCHED = "MATCHED"
    CLOSED = "CLOSED"
    EXPIRED = "EXPIRED"


class ChatSessionType(StrEnum):
    PRODUCT = "PRODUCT"
    WANTED = "WANTED"


class ChatMessageKind(StrEnum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    OFFER = "OFFER"
    ORDER_EVENT = "ORDER_EVENT"
    SYSTEM = "SYSTEM"


class OfferStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COUNTERED = "COUNTERED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class OrderStatus(StrEnum):
    PENDING_CONFIRM = "PENDING_CONFIRM"
    BOOKED = "BOOKED"
    MEETUP_ARRANGED = "MEETUP_ARRANGED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"


class MeetupStatus(StrEnum):
    PROPOSED = "PROPOSED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ReportTargetType(StrEnum):
    USER = "USER"
    PRODUCT = "PRODUCT"
    ORDER = "ORDER"
    CHAT_MESSAGE = "CHAT_MESSAGE"


class ReportReason(StrEnum):
    FAKE_PRODUCT = "FAKE_PRODUCT"
    DESCRIPTION_MISMATCH = "DESCRIPTION_MISMATCH"
    SPAM = "SPAM"
    ABNORMAL_PRICE = "ABNORMAL_PRICE"
    HARASSMENT = "HARASSMENT"
    VIOLATION = "VIOLATION"


class ReportStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class NotificationType(StrEnum):
    MESSAGE = "MESSAGE"
    OFFER_RECEIVED = "OFFER_RECEIVED"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    OFFER_REJECTED = "OFFER_REJECTED"
    MATCH_FOUND = "MATCH_FOUND"
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED"
    MEETUP_REMINDER = "MEETUP_REMINDER"
    REVIEW_REQUEST = "REVIEW_REQUEST"
    REPORT_RESULT = "REPORT_RESULT"
