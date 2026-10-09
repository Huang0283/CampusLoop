"""应用工厂与全局中间件（BP2-06）。

- 生成/透传 X-Request-ID（与日志、ErrorResponse.requestId 一致）
- CORS 只放行前端开发地址
- 全局异常兜底为契约 ErrorResponse 结构
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import system
from app.core.config import get_settings
from app.core.envelope import (
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging, request_id_var


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, as_json=settings.log_json)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        # Phase 3 在此初始化连接池预热等；Phase 2 保持无副作用
        yield

    app = FastAPI(
        title=settings.app_name,
        version="0.2.0",
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
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request_id_var.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    app.include_router(system.router)

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    return app


app = create_app()
