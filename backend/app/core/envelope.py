"""响应信封与统一错误结构（对齐 openapi/campusloop.v1.yaml）。

- 成功：{"code": 0, "message": "ok", "data": ...}
- 错误：{"code": "<MACHINE_CODE>", "message": "...", "details": {...}|null, "requestId": "..."}
"""

from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import request_id_var


def ok(data: Any = None, message: str = "ok") -> dict[str, Any]:
    return {"code": 0, "message": message, "data": data}


def error_payload(
    code: str,
    message: str,
    request_id: str,
    details: Any = None,
) -> dict[str, Any]:
    return {"code": code, "message": message, "details": details, "requestId": request_id}


def _request_id_of(request: Request) -> str:
    return request.headers.get("X-Request-ID") or request_id_var.get()


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=error_payload(
            code="VALIDATION_ERROR",
            message="Request validation failed.",
            request_id=_request_id_of(request),
            details=exc.errors(),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_payload(
            code="INTERNAL_ERROR",
            message="Unexpected server error.",
            request_id=_request_id_of(request),
        ),
    )
