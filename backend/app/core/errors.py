"""Safe, typed application failures; never expose request inputs or SQL parameters."""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.envelope import error_payload
from app.core.logging import request_id_var


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, headers: dict | None = None):
        self.status = status
        self.code = code
        self.message = message
        self.headers = headers or {}


async def business_error_handler(request: Request, exc: BusinessError) -> JSONResponse:
    headers = dict(exc.headers)
    if exc.status == 401:
        headers["WWW-Authenticate"] = "Bearer"
    return JSONResponse(
        status_code=exc.status,
        content=error_payload(exc.code, exc.message, request_id_var.get()),
        headers=headers,
    )
