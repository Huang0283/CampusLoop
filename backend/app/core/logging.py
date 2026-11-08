"""结构化日志（BP2-06）。

- 默认 JSON 行式（容器/生产友好），LOG_JSON=false 时输出纯文本（本地/CI 可读）。
- 提供 request_id 上下文变量，与错误响应中的 requestId 保持一致。
- 约定：不得打印 email、password_hash、token 等敏感值。
"""

from __future__ import annotations

import contextvars
import json
import logging
import re
import sys
from datetime import UTC, datetime
from typing import Any

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_SENSITIVE_KEYS = {
    "password",
    "passwordhash",
    "token",
    "accesstoken",
    "refreshtoken",
    "authorization",
    "secret",
    "email",
    "content",
    "evidence",
    # Cookies and derived browser/session credentials are bearer secrets too.
    "cookie",
    "setcookie",
    "browsercookie",
    "browsertoken",
    "sessiontoken",
    "tokenhash",
    "apikey",
}
_SENSITIVE_SUFFIXES = (
    "token",
    "tokenhash",
    "password",
    "passwordhash",
    "secret",
    "secretkey",
    "accesskey",
    "authorization",
    "privatekey",
    "cookie",
    "apikey",
    "email",
    "content",
    "evidence",
    "evidenceurl",
)


def _is_sensitive_key(key: Any) -> bool:
    normalized = re.sub(r"[^a-z0-9]", "", str(key).casefold())
    return normalized in _SENSITIVE_KEYS or normalized.endswith(_SENSITIVE_SUFFIXES)


def _scrub(value: Any) -> Any:
    """递归打码敏感键，防止日志泄漏。"""
    if isinstance(value, dict):
        return {k: ("***" if _is_sensitive_key(k) else _scrub(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [_scrub(v) for v in value]
    return value


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "requestId": request_id_var.get(),
            "message": record.getMessage(),
        }
        if record.exc_info:
            # Exception text/tracebacks may contain SQL bind values and private
            # request payloads. Retain only a diagnostic class name.
            payload["exceptionType"] = record.exc_info[0].__name__
        extra = getattr(record, "extra_data", None)
        if extra:
            payload["extra"] = _scrub(extra)
        return json.dumps(payload, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = (
            f"{datetime.now(UTC).isoformat()} "
            f"{record.levelname:<7} [{request_id_var.get()}] "
            f"{record.name}: {record.getMessage()}"
        )
        extra = getattr(record, "extra_data", None)
        if extra:
            base += f" extra={_scrub(extra)}"
        return base


def configure_logging(level: str = "INFO", as_json: bool = True) -> None:
    """初始化根日志器；幂等，可在应用工厂与脚本中重复调用。"""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if as_json else TextFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())
    for noisy in ("uvicorn.access",):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
