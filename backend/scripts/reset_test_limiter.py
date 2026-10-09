"""Explicit test-only rate-limiter reset; never usable against application Redis DB0/13."""

import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from redis import Redis

from app.core.config import get_settings


def main():
    settings = get_settings()
    if settings.app_env not in ("test", "ci") or urlsplit(settings.redis_url).path not in (
        "/14",
        "/15",
    ):
        raise SystemExit("Refused: APP_ENV=test/ci and dedicated Redis DB14/15 required.")
    with Redis.from_url(settings.redis_url) as redis:
        for key in redis.scan_iter("auth:*"):
            redis.delete(key)
    print("Isolated test auth counters reset; no business facts or application cache removed.")


if __name__ == "__main__":
    main()
