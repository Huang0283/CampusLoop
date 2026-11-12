"""Explicit R/S bootstrap in the matching isolated audit project only; JSON via stdin."""

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password, verify_password
from app.db.session import session_scope
from app.models import User


def validate_target(settings, namespace, run_id, project, credentials):
    if namespace not in ("permission", "business", "environment") or not re.fullmatch(
        r"[a-z0-9][a-z0-9-]{0,19}", run_id
    ):
        raise ValueError("Invalid audit namespace/run")
    expected = f"campusloop-{namespace}-{run_id}-audit"
    database = urlsplit(settings.database_url)
    redis = urlsplit(settings.redis_url)
    if (
        project != expected
        or settings.app_env not in ("test", "ci")
        or database.hostname != "db"
        or database.path != f"/campusloop_audit_{namespace}_{run_id.replace('-', '_')}"
        or redis.hostname != "redis"
        or redis.path != "/15"
        or settings.minio_endpoint != "minio:9000"
        or settings.minio_public_bucket != expected + "-public"
        or settings.minio_private_bucket != expected + "-private"
    ):
        raise ValueError("Refusing a daily, shared or mismatched audit target")
    if set(credentials) != {"R", "S"}:
        raise ValueError("Exactly R and S credentials are required")
    for alias, account in credentials.items():
        if (
            set(account) != {"email", "password"}
            or account["email"] != f"t1-{namespace}-{run_id}-{alias.lower()}@example.invalid"
            or not isinstance(account["password"], str)
            or not 16 <= len(account["password"]) <= 128
        ):
            raise ValueError("Credentials do not belong to this audit batch")


def seed(credentials):
    settings = get_settings()
    namespace, run_id, project = (
        os.environ.get(key, "") for key in ("AUDIT_NAMESPACE", "AUDIT_RUN_ID", "AUDIT_PROJECT")
    )
    validate_target(settings, namespace, run_id, project, credentials)
    result = {}
    with session_scope() as db:
        for alias, account in credentials.items():
            user = db.scalar(select(User).where(User.email == account["email"]).with_for_update())
            if user:
                if (
                    user.role != "ADMIN"
                    or user.status != "ACTIVE"
                    or not verify_password(user.password_hash, account["password"])
                ):
                    raise ValueError(
                        "Existing account differs; no promotion or reset was performed"
                    )
            else:
                user = User(
                    email=account["email"],
                    password_hash=hash_password(account["password"]),
                    nickname=f"审计管理员{alias}",
                    role="ADMIN",
                    status="ACTIVE",
                    campus_email_verified=True,
                )
                db.add(user)
                db.flush()
            result[alias] = {"id": user.id, "email": user.email, "role": user.role}
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(seed(json.load(sys.stdin))))
    except (ValueError, TypeError, KeyError):
        raise SystemExit("Audit seed rejected; no credentials were printed.") from None
