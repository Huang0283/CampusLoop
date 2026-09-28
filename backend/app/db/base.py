"""声明基类与命名约定（BP2-07）。

统一的约束命名约定保证 Alembic 自动生成/回滚的确定性，
避免 Postgres 匿名约束名（`xxx_pkey` 之外）在不同环境漂移。
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """全项目唯一声明基类；所有模型必须继承它，Alembic env 由此发现元数据。"""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)
