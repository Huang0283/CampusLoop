"""应用工厂与全局中间件（BP2-06）。

- 生成/透传 X-Request-ID（与日志、ErrorResponse.requestId 一致）
- CORS 只放行前端开发地址
- 全局异常兜底为契约 ErrorResponse 结构
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, intelligence, market, media, realtime, system, transactions
from app.core.config import get_settings
from app.core.envelope import (
    error_payload,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.errors import BusinessError, business_error_handler
from app.core.logging import configure_logging, request_id_var
from app.services import matching_jobs  # noqa: F401 -- transactional outbox registration


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, as_json=settings.log_json)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        # Phase 3 在此初始化连接池预热等；Phase 2 保持无副作用
        yield

    app = FastAPI(
        title=settings.app_name,
        version="0.3.0",
        # /docs 仅本地调试用；生产由 APP_ENV 控制
        docs_url="/docs" if settings.app_env != "prod" else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id_middleware(request, call_next):
        started = time.monotonic()
        provided = request.headers.get("X-Request-ID", "")
        rid = (
            provided
            if 0 < len(provided) <= 64
            and all(c.isascii() and (c.isalnum() or c in "-_") for c in provided)
            else uuid.uuid4().hex[:12]
        )
        context = request_id_var.set(rid)
        request.state.request_id = rid
        try:
            auth_path = request.url.path.startswith("/auth/") or request.url.path == "/users/me"
            if auth_path and request.method != "OPTIONS":
                origin = request.headers.get("origin")
                if origin and origin not in settings.cors_origin_list:
                    return JSONResponse(
                        status_code=403,
                        content=error_payload("FORBIDDEN", "Origin is not permitted.", rid),
                        headers={"X-Request-ID": rid, "Cache-Control": "no-store"},
                    )
                if (
                    request.method in ("POST", "PATCH")
                    and request.url.path != "/auth/logout"
                    and request.headers.get("content-type", "").split(";", 1)[0]
                    != "application/json"
                ):
                    return JSONResponse(
                        status_code=415,
                        content=error_payload("UNSUPPORTED_MEDIA_TYPE", "JSON required.", rid),
                        headers={"X-Request-ID": rid, "Cache-Control": "no-store"},
                    )
            response = await call_next(request)
            if request.headers.get("Authorization"):
                response.headers["Cache-Control"] = "no-store"
                response.headers["Vary"] = ", ".join(
                    filter(None, [response.headers.get("Vary"), "Authorization"])
                )
            route = request.scope.get("route")
            logging.getLogger("http").info(
                "request_finished method=%s route=%s status=%s duration_ms=%d",
                request.method,
                getattr(route, "path", "unmatched"),
                response.status_code,
                int((time.monotonic() - started) * 1000),
            )
            response.headers["X-Request-ID"] = rid
            if auth_path:
                response.headers["Cache-Control"] = "no-store"
            return response
        finally:
            request_id_var.reset(context)

    app.include_router(system.router)
    app.include_router(auth.router)
    app.include_router(market.router)
    app.include_router(transactions.router)
    app.include_router(realtime.router)
    app.include_router(intelligence.router)
    app.include_router(media.router)

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(BusinessError, business_error_handler)
    return app


app = create_app()
