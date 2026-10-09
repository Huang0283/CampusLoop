"""Argon2id and fixed-algorithm JWTs. Secrets and tokens are never logged."""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import get_settings
from app.core.errors import BusinessError

password_hasher = PasswordHasher(
    time_cost=2, memory_cost=19456, parallelism=1, hash_len=32, salt_len=16
)
dummy_hash = password_hasher.hash(secrets.token_urlsafe(32))


def utcnow() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(encoded: str, password: str) -> bool:
    try:
        return password_hasher.verify(encoded, password)
    except (InvalidHashError, VerificationError):
        return False


def signing_key() -> str:
    key = get_settings().auth_signing_key
    if len(key.encode()) < 32:
        raise BusinessError(503, "AUTH_SERVICE_UNAVAILABLE", "Authentication is not configured.")
    return key


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_pair(user_id: int, family_id: str, deadline: datetime) -> dict:
    settings = get_settings()
    now = int(utcnow().timestamp())
    ttl = min(max(1, settings.auth_access_ttl_seconds), 900, int(deadline.timestamp()) - now)
    if ttl <= 0:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session expired.")
    access = jwt.encode(
        {
            "iss": "campusloop-api",
            "aud": "campusloop-web",
            "sub": str(user_id),
            "sid": family_id,
            "jti": uuid.uuid4().hex,
            "iat": now,
            "exp": now + ttl,
        },
        signing_key(),
        algorithm="HS256",
        headers={"kid": settings.auth_signing_kid},
    )
    return {"accessToken": access, "refreshToken": secrets.token_urlsafe(32), "expiresIn": ttl}


def decode_access(token: str) -> dict:
    key = signing_key()
    try:
        header = jwt.get_unverified_header(token)
        if header.get("kid") != get_settings().auth_signing_kid or header.get("alg") != "HS256":
            raise ValueError("invalid header")
        claims = jwt.decode(
            token,
            key,
            algorithms=["HS256"],
            audience="campusloop-web",
            issuer="campusloop-api",
            leeway=0,
            options={"require": ["iss", "aud", "sub", "sid", "jti", "iat", "exp"]},
        )
        if not isinstance(claims["sub"], str) or not 0 < int(claims["sub"]) <= 9007199254740991:
            raise ValueError("invalid subject")
        uuid.UUID(claims["sid"])
        return claims
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Invalid or expired session.") from None
