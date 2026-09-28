"""结构化日志（BP2-06）。

- 默认 JSON 行式（容器/生产友好），LOG_JSON=false 时输出纯文本（本地/CI 可读）。
- 提供 request_id 上下文变量，与错误响应中的 requestId 保持一致。
- 约定：不得打印 email、password_hash、token 等敏感值。
"""

from __future__ import annotations

import contextvars
import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

_SENSITIVE_KEYS = {"password", "password_hash", "token", "refresh_token", "authorization", "secret"}


def _scrub(value: Any) -> Any:
    """递归打码敏感键，防止日志泄漏。"""
    if isinstance(value, dict):
        return {k: ("***" if k.lower() in _SENSITIVE_KEYS else _scrub(v)) for k, v in value.items()}
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
            payload["exception"] = self.formatException(record.exc_info)
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
