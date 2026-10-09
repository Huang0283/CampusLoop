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
    return getattr(request.state, "request_id", None) or request_id_var.get()


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=400 if any(item["type"] == "json_invalid" for item in exc.errors()) else 422,
        content=error_payload(
            code="INVALID_JSON"
            if any(item["type"] == "json_invalid" for item in exc.errors())
            else "VALIDATION_ERROR",
            message="Request validation failed.",
            request_id=_request_id_of(request),
            # Never serialize Pydantic's input/ctx: those may contain passwords or tokens.
            details={"fields": [".".join(map(str, item["loc"])) for item in exc.errors()]},
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id_of(request)
    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request_id, "Cache-Control": "no-store"},
        content=error_payload(
            code="INTERNAL_ERROR",
            message="Unexpected server error.",
            request_id=request_id,
        ),
    )
