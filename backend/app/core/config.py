"""集中配置加载（BP2-06）。

所有可变参数只从环境变量 / .env 读取，代码中不出现任何密钥。
与根目录 `.env.example` 一一对应。
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """CampusLoop 后端运行配置。"""

    model_config = SettingsConfigDict(
        # Read the documented root file independently of the caller's cwd;
        # backend/.env can override it for local development. Real environment
        # variables (including Compose injection) retain highest precedence.
        env_file=(BACKEND_DIRECTORY.parent / ".env", BACKEND_DIRECTORY / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- application ----
    app_name: str = "CampusLoop API"
    app_env: str = "dev"  # dev | ci | prod
    log_level: str = "INFO"
    log_json: bool = True
    cors_origins: str = "http://localhost:5173"

    auth_signing_key: str = ""
    auth_signing_kid: str = "primary"
    auth_access_ttl_seconds: int = 900
    auth_refresh_ttl_seconds: int = 604800
    auth_registration_domains: str = "example.com,example.invalid"
    baseline_services_enabled: bool = True
    matching_notifications_enabled: bool = True
    auth_cookie_name: str = "campusloop-session"
    auth_cookie_secure: bool = False  # Production always enforces Secure and __Host-.
    baseline_rpc_token: str = ""
    m7_service_url: str = "http://127.0.0.1:8787"
    m8_service_url: str = "http://127.0.0.1:8788"

    # ---- database (PostgreSQL 16 + pgvector) ----
    database_url: str = "postgresql+psycopg://campusloop:campusloop@localhost:5432/campusloop"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_connect_timeout_seconds: int = 3

    # ---- redis ----
    redis_url: str = "redis://localhost:6379/0"
    redis_socket_timeout_seconds: float = 1.5

    # ---- object storage (MinIO, S3 protocol; 双桶权限隔离) ----
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    # 公共桶：商品图片等可公开内容，匿名可读
    minio_public_bucket: str = "campusloop-public"
    # 私有桶：私聊/举报敏感对象，禁止匿名访问，由鉴权媒体API读取。
    minio_private_bucket: str = "campusloop-private"
    minio_secure: bool = False
    s3_public_base_url: str = "http://localhost:9000/campusloop-public"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """进程内单例；测试可用 get_settings.cache_clear() 重置。"""
    return Settings()
