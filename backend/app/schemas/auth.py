import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class LoginRequest(StrictInput):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized.isascii() or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Invalid email format.")
        return normalized


class RegisterRequest(LoginRequest):
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(min_length=1, max_length=40)

    @field_validator("nickname")
    @classmethod
    def normalize_nickname(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Nickname required.")
        return value.strip()


class RefreshRequest(StrictInput):
    refreshToken: str = Field(min_length=1, max_length=512)


class BrowserSessionRequest(StrictInput):
    pass


class ProfileUpdate(StrictInput):
    nickname: str | None = Field(default=None, min_length=1, max_length=40)
    avatar: str | None = Field(default=None, max_length=512)
    bio: str | None = Field(default=None, max_length=500)
    school: str | None = Field(default=None, max_length=80)
    college: str | None = Field(default=None, max_length=80)
    major: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def validate_patch(self):
        if not self.model_fields_set:
            raise ValueError("At least one profile field is required.")
        if "nickname" in self.model_fields_set:
            if self.nickname is None or not self.nickname.strip():
                raise ValueError("Nickname cannot be empty.")
            self.nickname = self.nickname.strip()
        if self.avatar is not None and not re.fullmatch(r"https?://[^\s]+", self.avatar):
            raise ValueError("Avatar must use HTTP or HTTPS.")
        return self


class UserStatusUpdate(StrictInput):
    status: Literal["ACTIVE", "DISABLED"]
    reason: str = Field(min_length=1, max_length=200)

    @field_validator("reason")
    @classmethod
    def nonempty_reason(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Reason is required.")
        return value.strip()
