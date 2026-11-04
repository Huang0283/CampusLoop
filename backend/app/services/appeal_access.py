"""Short-lived, separate-audience access to one's own decisions, never to transactions."""

from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy import select

from app.core.errors import BusinessError
from app.core.security import signing_key, utcnow
from app.models import User
from app.services.auth import Db, authenticate, bearer, student


def disabled_error(user: User) -> BusinessError:
    now = int(utcnow().timestamp())
    token = jwt.encode(
        {
            "sub": str(user.id),
            "iat": now,
            "exp": now + 900,
            "aud": "account-appeals",
            "scope": "own-appeals",
        },
        signing_key(),
        algorithm="HS256",
    )
    return BusinessError(
        423,
        "ACCOUNT_DISABLED",
        "账号已被禁用，你可以查看处理记录并提交申诉。",
        details={"appealToken": token, "expiresIn": 900},
    )


def appeal_actor(request: Request, db: Db) -> User:
    token = bearer(request)
    try:
        claims = jwt.decode(
            token,
            signing_key(),
            algorithms=["HS256"],
            audience="account-appeals",
            options={"require": ["sub", "iat", "exp", "scope"]},
        )
        if claims["scope"] != "own-appeals" or not isinstance(claims["sub"], str):
            raise ValueError("Invalid scope")
        user_id = int(claims["sub"])
        if not 0 < user_id <= 9007199254740991:
            raise ValueError("Invalid subject")
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        user, _ = authenticate(db, token)
    else:
        user = db.scalar(select(User).where(User.id == user_id).with_for_update(key_share=True))
        if not user:
            raise BusinessError(401, "AUTH_UNAUTHORIZED", "请重新登录后查看处理记录。")
    student(user)
    return user


AppealActor = Annotated[User, Depends(appeal_actor)]
