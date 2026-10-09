"""种子与测试数据脚本（BP2-08）。

幂等策略：
- 所有种子行使用显式主键（1000+ 段，避开业务自增区间）；
- 全部 INSERT ... ON CONFLICT DO NOTHING，重复执行零副作用；
- 验收口径：连跑两遍，行数与内容完全一致（scripts/seed.py --check 可自动比对）。

数据说明：
- 全部为教学模拟数据：虚构姓名/邮箱（example.com 域），不含任何真实个人信息；
- 密码用 stdlib scrypt 派生哈希（教学演示用，Phase 3 由 M5 换成正式认证方案）；
- 覆盖实体：users / products / favorites / wanted / chat_sessions / chat_messages /
  offers / orders / order_events / meetups / reviews / reports / notifications。

用法：
    python scripts/seed.py           # 写入种子数据（幂等）
    python scripts/seed.py --check   # 校验两遍执行结果一致（CI 用）
"""

from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.security import hash_password as secure_hash_password
from app.db.session import session_scope
from app.models import (
    ChatMessage,
    ChatSession,
    Favorite,
    Meetup,
    Notification,
    Offer,
    Order,
    OrderEvent,
    Product,
    ProductImage,
    Report,
    Review,
    User,
    WantedPost,
)
from app.models.enums import (
    ChatMessageKind,
    ChatSessionType,
    MeetupStatus,
    NotificationType,
    OfferStatus,
    OrderStatus,
    ProductStatus,
    ReportReason,
    ReportStatus,
    ReportTargetType,
    Role,
    UserStatus,
    WantedStatus,
)

NOW = datetime(2026, 9, 22, 12, 0, 0, tzinfo=UTC)


def hash_password(password: str, salt: str) -> str:
    """Same Argon2id as registration; old signature retained for seed callers."""
    return secure_hash_password(password)


def upsert(session, model, rows: list[dict]) -> int:
    """按主键 ON CONFLICT DO NOTHING 插入，返回实际新插入行数。"""
    if not rows:
        return 0
    stmt = (
        pg_insert(model)
        .values(rows)
        .on_conflict_do_nothing(index_elements=["id"])
        .returning(model.id)
    )
    result = session.execute(stmt)
    # psycopg may expose rowcount=-1 for executemany/RETURNING. Count returned
    # primary keys so logs never claim a negative number of inserted rows.
    return len(result.scalars().all())


def seed_users() -> list[dict]:
    """4 个虚构账号：2 买家、1 卖家、1 管理员。默认密码均为 Demo@12345。"""
    return [
        dict(
            id=1001,
            email="chen.demo@example.com",
            password_hash=hash_password("Demo@12345", "seed-salt-1"),
            nickname="阿橙",
            role=Role.USER.value,
            status=UserStatus.ACTIVE.value,
            campus_email_verified=True,
            bio="大三，出闲置教材和数码",
            rating_avg=4.8,
            transaction_count=12,
        ),
        dict(
            id=1002,
            email="lin.demo@example.com",
            password_hash=hash_password("Demo@12345", "seed-salt-2"),
            nickname="小林",
            role=Role.USER.value,
            status=UserStatus.ACTIVE.value,
            campus_email_verified=True,
            bio="求一辆通勤自行车",
            rating_avg=4.5,
            transaction_count=3,
        ),
        dict(
            id=1003,
            email="zhao.demo@example.com",
            password_hash=hash_password("Demo@12345", "seed-salt-3"),
            nickname="赵同学",
            role=Role.USER.value,
            status=UserStatus.ACTIVE.value,
            campus_email_verified=True,
            bio="毕业甩卖",
            rating_avg=4.9,
            transaction_count=21,
        ),
        dict(
            id=1004,
            email="admin.demo@example.com",
            password_hash=hash_password("Demo@12345", "seed-salt-4"),
            nickname="平台管理员",
            role=Role.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            campus_email_verified=True,
            bio="内容治理演示账号",
            rating_avg=0,
            transaction_count=0,
        ),
    ]


def seed_products() -> list[dict]:
    return [
        dict(
            id=2001,
            owner_id=1001,
            title="高等数学教材（第八版）上下册",
            description="九成新，无笔记，含习题解答",
            category="BOOKS",
            condition="LIKE_NEW",
            price=45,
            original_price=89,
            campus_location="东区宿舍 3 栋",
            status=ProductStatus.ON_SALE.value,
            attributes={"edition": 8},
            view_count=128,
            favorite_count=6,
        ),
        dict(
            id=2002,
            owner_id=1001,
            title="罗技 K380 蓝牙键盘（薄荷色）",
            description="自用一年，电池仓有轻微划痕，功能正常",
            category="DIGITAL",
            condition="GOOD",
            price=99,
            original_price=199,
            campus_location="东区宿舍 3 栋",
            status=ProductStatus.ON_SALE.value,
            attributes={"color": "mint"},
            view_count=356,
            favorite_count=21,
        ),
        dict(
            id=2003,
            owner_id=1003,
            title="捷安特 ATX660 山地车 26 寸",
            description="大四毕业出，刚换的新外胎，校内可看车",
            category="SPORTS",
            condition="GOOD",
            price=560,
            original_price=1898,
            campus_location="北门车棚",
            status=ProductStatus.ON_SALE.value,
            attributes={"size": 26},
            view_count=542,
            favorite_count=33,
        ),
        dict(
            id=2004,
            owner_id=1003,
            title="小米台灯 Pro",
            description="宿舍神器，色温亮度无级调节，带原装电源",
            category="DAILY",
            condition="LIKE_NEW",
            price=79,
            original_price=169,
            campus_location="西区宿舍 9 栋",
            status=ProductStatus.ON_SALE.value,
            attributes={},
            view_count=97,
            favorite_count=8,
        ),
        dict(
            id=2005,
            owner_id=1003,
            title="C语言程序设计（谭浩强）",
            description="期末划重点版，重点已标注",
            category="BOOKS",
            condition="FAIR",
            price=12,
            original_price=36,
            campus_location="西区宿舍 9 栋",
            status=ProductStatus.SOLD.value,
            attributes={"edition": 5},
            view_count=64,
            favorite_count=2,
        ),
        dict(
            id=2006,
            owner_id=1001,
            title="宜家马克杯 4 只装",
            description="搬家出，几乎没用过",
            category="DAILY",
            condition="NEW",
            price=25,
            original_price=49,
            campus_location="东区宿舍 3 栋",
            status=ProductStatus.HIDDEN.value,
            attributes={},
            view_count=12,
            favorite_count=1,
        ),
    ]


def seed_wanted() -> list[dict]:
    return [
        dict(
            id=3001,
            owner_id=1002,
            title="求二手蓝牙耳机",
            description="预算内求 AirPods 或同价位国产品牌",
            category="DIGITAL",
            budget_min=100,
            budget_max=250,
            requirements={"condition": ["NEW", "LIKE_NEW"], "campus": "east"},
            status=WantedStatus.OPEN.value,
        ),
        dict(
            id=3002,
            owner_id=1002,
            title="求考研英语一真题 2015-2025",
            description="有笔记也行，成套优先",
            category="BOOKS",
            budget_min=20,
            budget_max=50,
            requirements=None,
            status=WantedStatus.OPEN.value,
        ),
    ]


def seed_chat_and_offers() -> tuple[list[dict], list[dict], list[dict]]:
    sessions = [
        dict(
            id=4001,
            session_type=ChatSessionType.PRODUCT.value,
            product_id=2003,
            buyer_id=1002,
            seller_id=1003,
        ),
    ]
    messages = [
        dict(
            id=4101,
            session_id=4001,
            sender_id=1002,
            client_msg_id="00000000-0000-4000-8000-000000004101",
            kind=ChatMessageKind.TEXT.value,
            content="你好，车还在吗？能约北门看车吗？",
            created_at=NOW - timedelta(days=2, hours=3),
        ),
        dict(
            id=4102,
            session_id=4001,
            sender_id=1003,
            client_msg_id="00000000-0000-4000-8000-000000004102",
            kind=ChatMessageKind.TEXT.value,
            content="在的，周六上午都可以",
            created_at=NOW - timedelta(days=2, hours=2),
        ),
        dict(
            id=4103,
            session_id=4001,
            sender_id=1002,
            client_msg_id="00000000-0000-4000-8000-000000004103",
            kind=ChatMessageKind.TEXT.value,
            content="500 出吗？",
            created_at=NOW - timedelta(days=1, hours=4),
        ),
    ]
    offers = [
        dict(
            id=5001,
            proposer_id=1002,
            session_id=4001,
            buyer_id=1002,
            seller_id=1003,
            amount=500,
            message="含车锁一起出吧",
            status=OfferStatus.ACCEPTED.value,
            idempotency_key="seed-offer-5001",
            responded_at=NOW - timedelta(days=1, hours=3),
        ),
    ]
    return sessions, messages, offers


def seed_orders() -> tuple[list[dict], list[dict], list[dict]]:
    orders = [
        dict(
            id=6001,
            product_id=2005,
            buyer_id=1002,
            seller_id=1003,
            amount=12,
            status=OrderStatus.COMPLETED.value,
            version=3,
            buyer_confirmed_complete=True,
            seller_confirmed_complete=True,
            created_at=NOW - timedelta(days=10),
        ),
        dict(
            id=6002,
            product_id=2003,
            offer_id=5001,
            buyer_id=1002,
            seller_id=1003,
            amount=500,
            status=OrderStatus.MEETUP_ARRANGED.value,
            version=2,
            created_at=NOW - timedelta(days=1, hours=3),
        ),
    ]
    events = [
        dict(
            id=7001,
            order_id=6001,
            from_status=None,
            to_status=OrderStatus.PENDING_CONFIRM.value,
            operator_id=1002,
            description="买家发起订单",
            created_at=NOW - timedelta(days=10),
        ),
        dict(
            id=7002,
            order_id=6001,
            from_status=OrderStatus.PENDING_CONFIRM.value,
            to_status=OrderStatus.BOOKED.value,
            operator_id=1003,
            description="卖家确认订单",
            created_at=NOW - timedelta(days=9),
        ),
        dict(
            id=7003,
            order_id=6001,
            from_status=OrderStatus.BOOKED.value,
            to_status=OrderStatus.COMPLETED.value,
            operator_id=1002,
            description="双方确认完成",
            created_at=NOW - timedelta(days=8),
        ),
        dict(
            id=7004,
            order_id=6002,
            from_status=None,
            to_status=OrderStatus.PENDING_CONFIRM.value,
            operator_id=1002,
            description="报价被接受，订单创建",
            created_at=NOW - timedelta(days=1, hours=3),
        ),
        dict(
            id=7005,
            order_id=6002,
            from_status=OrderStatus.PENDING_CONFIRM.value,
            to_status=OrderStatus.MEETUP_ARRANGED.value,
            operator_id=1003,
            description="约定周六北门看车",
            created_at=NOW - timedelta(hours=20),
        ),
    ]
    meetups = [
        dict(
            id=8001,
            order_id=6002,
            place="北门车棚",
            proposed_slots={"slots": [(NOW + timedelta(days=2)).isoformat()]},
            confirmed_slot=NOW + timedelta(days=2),
            status=MeetupStatus.CONFIRMED.value,
            version=1,
            buyer_confirmed_version=1,
            seller_confirmed_version=1,
        ),
    ]
    return orders, events, meetups


def seed_reviews() -> list[dict]:
    return [
        dict(
            id=9001,
            order_id=6001,
            reviewer_id=1002,
            reviewee_id=1003,
            rating=5,
            description_accuracy=5,
            communication=5,
            punctuality=5,
            comment="书有点旧但描述属实，人爽快",
        ),
    ]


def seed_reports_and_notifications() -> tuple[list[dict], list[dict]]:
    reports = [
        dict(
            id=11001,
            reporter_id=1002,
            target_type=ReportTargetType.PRODUCT.value,
            target_id=2006,
            reason=ReportReason.ABNORMAL_PRICE.value,
            description="隐藏商品的演示举报数据",
            status=ReportStatus.PENDING.value,
        ),
    ]
    notifications = [
        dict(
            id=12001,
            user_id=1002,
            type=NotificationType.MATCH_FOUND.value,
            payload={"wantedId": 3001, "productId": 2002, "score": 0.87},
            read_at=None,
            created_at=NOW - timedelta(hours=6),
        ),
        dict(
            id=12002,
            user_id=1003,
            type=NotificationType.ORDER_STATUS_CHANGED.value,
            payload={"orderId": 6002, "toStatus": OrderStatus.MEETUP_ARRANGED.value},
            read_at=None,
            created_at=NOW - timedelta(hours=20),
        ),
        dict(
            id=12003,
            user_id=1002,
            type=NotificationType.REVIEW_REQUEST.value,
            payload={"orderId": 6001},
            read_at=NOW - timedelta(days=7),
            created_at=NOW - timedelta(days=8),
        ),
    ]
    return reports, notifications


SEED_TABLES: list[type] = [
    User,
    Product,
    ProductImage,
    Favorite,
    WantedPost,
    ChatSession,
    ChatMessage,
    Offer,
    Order,
    OrderEvent,
    Meetup,
    Review,
    Report,
    Notification,
]


def run_seed(session, *, verbose: bool = True) -> dict[str, int]:
    """写入全部种子数据，返回 {表名: 本次新增行数}。"""
    inserted: dict[str, int] = {}

    sessions, messages, offers = seed_chat_and_offers()
    orders, events, meetups = seed_orders()
    reports, notifications = seed_reports_and_notifications()

    plan: list[tuple[type, list[dict]]] = [
        (User, seed_users()),
        (Product, seed_products()),
        (
            ProductImage,
            [
                dict(id=2101, product_id=2001, object_key="seed/product-2001-1.jpg", sort_order=0),
                dict(id=2102, product_id=2003, object_key="seed/product-2003-1.jpg", sort_order=0),
            ],
        ),
        (
            Favorite,
            [
                dict(id=2201, user_id=1002, product_id=2003),
                dict(id=2202, user_id=1002, product_id=2002),
            ],
        ),
        (WantedPost, seed_wanted()),
        (ChatSession, sessions),
        (ChatMessage, messages),
        (Offer, offers),
        (Order, orders),
        (OrderEvent, events),
        (Meetup, meetups),
        (Review, seed_reviews()),
        (Report, reports),
        (Notification, notifications),
    ]

    for model, rows in plan:
        inserted[model.__tablename__] = upsert(session, model, rows)

    if verbose:
        for table, count in inserted.items():
            print(f"  {table:<16} +{count}")
    return inserted


def snapshot_counts(session) -> dict[str, int]:
    """各表当前行数快照（--check 用）。"""
    counts = {}
    for model in SEED_TABLES:
        counts[model.__tablename__] = session.scalar(select(func.count()).select_from(model)) or 0
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="CampusLoop 种子数据（幂等）")
    parser.add_argument(
        "--check", action="store_true", help="连跑两遍并比对行数快照，验证幂等性（退出码 0=通过）"
    )
    args = parser.parse_args()

    with session_scope() as session:
        print("[seed] 第一遍写入：")
        run_seed(session)
        first = snapshot_counts(session)

        if not args.check:
            print("[seed] 完成。各表行数：", first)
            return 0

        print("[seed] 第二遍写入（幂等性验证）：")
        run_seed(session)
        second = snapshot_counts(session)

    if first != second:
        print("[seed][FAIL] 两遍行数不一致：", first, second)
        return 1
    print("[seed][PASS] 两遍执行结果完全一致：", second)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
