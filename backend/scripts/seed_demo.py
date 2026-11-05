"""Create labeled synthetic records in a demo database or the opted-in local marketplace."""

import argparse
import hashlib
import io
import json
import os
import sys
from datetime import timedelta
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image, ImageDraw
from sqlalchemy import func, select, text

from app.core.config import get_settings
from app.core.security import hash_password, utcnow
from app.db.session import session_scope
from app.models import (
    AccountAppeal,
    AccountDecision,
    AuthAudit,
    ChatMessage,
    ChatReadCursor,
    ChatSession,
    Favorite,
    Meetup,
    Offer,
    Order,
    OrderEvent,
    Product,
    ProductImage,
    Report,
    Review,
    UploadedObject,
    User,
    WantedPost,
)
from app.services.business import notify
from app.services.storage import storage_client

ASSETS = Path(__file__).resolve().parents[1] / "demo_assets"
VERSION = "campusloop-demo-v1"
PASSWORD = "CampusDemo@2026"  # Public synthetic accounts only.
EMAILS = ("demo.seller@example.invalid", "demo.buyer@example.invalid", "demo.admin@example.invalid")


def guard(settings, *, into_local=False):
    database = urlsplit(settings.database_url).path.lstrip("/")
    if into_local:
        if (
            os.environ.get("CAMPUSLOOP_LOCAL_DEMO_IMPORT") != VERSION
            or settings.app_env != "dev"
            or database != "campusloop"
            or urlsplit(settings.redis_url).path != "/0"
        ):
            raise RuntimeError(
                "Shared demo import requires the explicitly opted-in local marketplace."
            )
        return
    if (
        os.environ.get("CAMPUSLOOP_DEMO_DATASET") != VERSION
        or settings.app_env == "prod"
        or not (database == "campusloop_demo" or database.startswith("campusloop_demo_test_"))
        or urlsplit(settings.redis_url).path not in ("/14", "/15")
    ):
        raise RuntimeError(
            "Demo initialization requires an explicit isolated demo database and Redis DB14/15."
        )


def catalog():
    data = json.loads((ASSETS / "catalog.json").read_text(encoding="utf-8"))
    assert data["version"] == VERSION and data["synthetic"] is True
    assert len(data["products"]) == 25
    for item in data["products"]:
        assert item["title"].startswith("【演示】") and len(item["title"]) <= 100
        assert not any(
            word in item["title"] + item["description"]
            for word in ("小学生", "儿童", "宝宝", "幼儿")
        )
        assert 0 < item["price"] < 10000 and item["images"]
        for name, provenance in zip(item["images"], item["provenance"], strict=True):
            path = (ASSETS / name).resolve()
            assert path.is_relative_to(ASSETS.resolve())
            assert hashlib.sha256(path.read_bytes()).hexdigest() == provenance["sha256"]
    return data["products"]


def create_demo(db, items, *, administrator=None):
    now = utcnow().replace(microsecond=0)
    users = []
    for email, name, role in zip(
        EMAILS[:2] if administrator else EMAILS,
        ("演示卖家·小林", "演示买家·小周")
        if administrator
        else ("演示卖家·小林", "演示买家·小周", "演示管理员"),
        ("USER", "USER") if administrator else ("USER", "USER", "ADMIN"),
        strict=True,
    ):
        user = User(
            email=email,
            nickname=name,
            password_hash=hash_password(PASSWORD),
            role=role,
            status="ACTIVE",
            campus_email_verified=False,
            created_at=now - timedelta(days=60),
            bio=f"【合成演示账号】{VERSION}，记录仅用于功能展示，不是真实交易。",
        )
        db.add(user)
        db.flush()
        users.append(user)
    created_users = users.copy()
    if administrator:
        users.append(administrator)
    seller, buyer, admin = users
    settings = get_settings()
    client = storage_client()

    def store(owner, filename, purpose="product", private=False, content=None):
        key = f"demo-v1/{purpose}/{owner.id}/{filename}"
        content = content if content is not None else (ASSETS / filename).read_bytes()
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"
        client.put_object(
            Bucket=settings.minio_private_bucket if private else settings.minio_public_bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        db.add(
            UploadedObject(
                owner_id=owner.id,
                object_key=key,
                purpose=purpose,
                content_type=content_type,
                size=len(content),
            )
        )
        return key

    for user, avatar in zip(
        created_users,
        ("seller-avatar.png", "buyer-avatar.png", "admin-avatar.png")[: len(created_users)],
        strict=True,
    ):
        user.avatar_url = (
            settings.s3_public_base_url.rstrip("/") + "/" + store(user, avatar, "avatar")
        )

    evidence_image = Image.new("RGB", (900, 320), "#f3f6fc")
    draw = ImageDraw.Draw(evidence_image)
    for i, line in enumerate(
        (
            "SYNTHETIC DEMO EVIDENCE",
            "Not a real complaint or transaction.",
            "Scenario: missed campus meetup / listing description review.",
            "For isolated CampusLoop feature demonstration only.",
        )
    ):
        draw.text((30, 35 + i * 60), line, fill="#203040", font_size=24)
    buffer = io.BytesIO()
    evidence_image.save(buffer, format="PNG")
    evidence = {
        user.id: store(user, "evidence.png", "evidence", True, buffer.getvalue()) for user in users
    }
    products, sessions = [], []
    for index, item in enumerate(items):
        created = now - timedelta(days=40 - index)
        status = (
            "SOLD"
            if index < 15
            else "RESERVED"
            if index in (15, 22, 23)
            else "HIDDEN"
            if index == 24
            else "ON_SALE"
        )
        product = Product(
            owner_id=seller.id,
            title=item["title"],
            description=item["description"],
            category=item["category"],
            condition=item["condition"],
            price=item["price"],
            campus_location="校内公共交接点（具体位置聊天确认）",
            status=status,
            moderation_blocked=index == 24,
            attributes={"syntheticDemo": VERSION},
            created_at=created,
            updated_at=created,
        )
        db.add(product)
        db.flush()
        products.append(product)
        for position, filename in enumerate(item["images"]):
            db.add(
                ProductImage(
                    product_id=product.id, object_key=store(seller, filename), sort_order=position
                )
            )
        session = ChatSession(
            session_type="PRODUCT",
            product_id=product.id,
            buyer_id=buyer.id,
            seller_id=seller.id,
            created_at=created + timedelta(hours=1),
            updated_at=created + timedelta(hours=3),
            last_message_at=created + timedelta(hours=3),
        )
        db.add(session)
        db.flush()
        sessions.append(session)
        dialog = [
            (buyer, f'【演示对话】你好，这件{item["title"].removeprefix("【演示】")}还在吗？'),
            (seller, "在的。图片就是商品展示图，具体成色和配件可以校内当面检查。"),
            (buyer, f'标价{item["price"]}元，可以先核对配件再决定吗？'),
            (seller, "可以，校内公共交接点见面，具体时间在订单里确认。"),
            (buyer, "好的，我会按约定到场；有变化提前在这里说明。"),
            (seller, "【演示对话】收到，订单和通知里可以查看后续进度。"),
        ]
        for offset, (speaker, content) in enumerate(dialog):
            db.add(
                ChatMessage(
                    client_msg_id=str(uuid4()),
                    session_id=session.id,
                    sender_id=speaker.id,
                    kind="TEXT",
                    content=content,
                    created_at=created + timedelta(hours=1, minutes=offset * 8),
                )
            )
        db.flush()
        latest = db.scalar(
            select(func.max(ChatMessage.id)).where(ChatMessage.session_id == session.id)
        )
        for user in (seller, buyer):
            db.add(
                ChatReadCursor(
                    session_id=session.id,
                    user_id=user.id,
                    last_message_id=latest if index < 22 else 0,
                )
            )
    db.flush()

    def order_for(index, status, age):
        product, session = products[index], sessions[index]
        created = now - timedelta(days=age, hours=4)
        amount = (Decimal(str(product.price)) * Decimal("0.9")).quantize(Decimal("0.01"))
        offer = Offer(
            session_id=session.id,
            buyer_id=buyer.id,
            seller_id=seller.id,
            proposer_id=buyer.id,
            amount=amount,
            message="【演示报价】现场核对后按此价格交接。",
            status="ACCEPTED",
            expires_at=created + timedelta(days=1),
            responded_at=created,
            created_at=created - timedelta(minutes=20),
            updated_at=created,
        )
        db.add(offer)
        db.flush()
        order = Order(
            product_id=product.id,
            offer_id=offer.id,
            buyer_id=buyer.id,
            seller_id=seller.id,
            status=status,
            amount=amount,
            version=4 if status == "COMPLETED" else 2,
            buyer_confirmed_complete=status == "COMPLETED",
            seller_confirmed_complete=status == "COMPLETED",
            cancelled_reason="【演示】见面时发现描述需进一步核对，等待平台处理。"
            if status == "DISPUTED"
            else "【演示】买家时间冲突，双方协商取消。"
            if status == "CANCELLED"
            else None,
            created_at=created,
            updated_at=created + timedelta(hours=3),
        )
        db.add(order)
        db.flush()
        path = [("PENDING_CONFIRM", "【演示】卖家接受报价，生成订单。")]
        if status in ("COMPLETED", "MEETUP_ARRANGED", "DISPUTED"):
            path.append(("MEETUP_ARRANGED", "【演示】双方确认校内见面约定。"))
        if status not in ("PENDING_CONFIRM", "MEETUP_ARRANGED"):
            path.append(
                (
                    status,
                    "【演示】双方确认交易完成。"
                    if status == "COMPLETED"
                    else "【演示】记录当前订单处理状态。",
                )
            )
        previous = None
        for offset, (state, explanation) in enumerate(path):
            db.add(
                OrderEvent(
                    order_id=order.id,
                    operator_id=seller.id if offset % 2 else buyer.id,
                    from_status=previous,
                    to_status=state,
                    description=explanation,
                    created_at=created + timedelta(hours=offset),
                )
            )
            previous = state
        slot = (
            created + timedelta(hours=2)
            if status in ("COMPLETED", "DISPUTED", "CANCELLED")
            else now + timedelta(days=2)
        )
        db.add(
            Meetup(
                order_id=order.id,
                place="校内公共交接点",
                version=1,
                proposed_slots={
                    "scheduledDate": slot.date().isoformat(),
                    "timeSlotStart": "14:00",
                    "timeSlotEnd": "15:00",
                    "campusLocation": "校内公共交接点",
                    "note": "【演示】提前在聊天中确认到达。",
                },
                confirmed_slot=slot if status != "PENDING_CONFIRM" else None,
                buyer_confirmed_version=1 if status != "PENDING_CONFIRM" else 0,
                seller_confirmed_version=1 if status != "PENDING_CONFIRM" else 0,
                status="COMPLETED"
                if status == "COMPLETED"
                else "CANCELLED"
                if status == "CANCELLED"
                else "PROPOSED"
                if status == "PENDING_CONFIRM"
                else "CONFIRMED",
                created_at=created,
                updated_at=created + timedelta(hours=2),
            )
        )
        db.add(
            ChatMessage(
                client_msg_id=str(uuid4()),
                session_id=session.id,
                sender_id=buyer.id,
                kind="OFFER",
                content=f"【演示报价】¥{amount}",
                payload={"offerId": offer.id},
                created_at=created,
            )
        )
        for user in (seller, buyer):
            notify(
                db,
                user.id,
                "ORDER_STATUS_CHANGED",
                f"/transactions/{order.id}",
                "演示订单进度更新",
                f"【合成记录】{product.title}，可打开查看订单与见面记录。",
            )
        if status == "COMPLETED":
            for reviewer, reviewee, stars in (
                (buyer, seller, 4 if index % 4 == 0 else 5),
                (seller, buyer, 5),
            ):
                if index != 14:
                    db.add(
                        Review(
                            order_id=order.id,
                            reviewer_id=reviewer.id,
                            reviewee_id=reviewee.id,
                            rating=stars,
                            description_accuracy=stars,
                            communication=5,
                            punctuality=5,
                            comment="【合成演示评价】校内交接顺利，描述和沟通体验记录。",
                            created_at=created + timedelta(hours=3),
                        )
                    )
                notify(
                    db,
                    reviewer.id,
                    "REVIEW_REQUEST",
                    f"/transactions/{order.id}/review",
                    "演示交易已完成",
                    "【合成记录】请查看评价入口。",
                )
        return order

    orders = [order_for(i, "COMPLETED", 30 - i * 2) for i in range(15)]
    disputed = order_for(15, "DISPUTED", 1)
    order_for(16, "CANCELLED", 1)
    order_for(22, "PENDING_CONFIRM", 0)
    order_for(23, "MEETUP_ARRANGED", 0)
    for index in range(16, 22):
        db.add(Favorite(user_id=buyer.id, product_id=products[index].id))
        products[index].favorite_count = 1
    db.add(
        WantedPost(
            owner_id=buyer.id,
            title="【演示】求购羽毛球拍",
            description="【合成演示需求】大学体育课使用，校内交接。",
            category="SPORTS",
            budget_min=10,
            budget_max=50,
            requirements={"condition": "GOOD", "location": "ANY"},
            status="OPEN",
            expires_at=now + timedelta(days=30),
            created_at=now - timedelta(days=1),
        )
    )

    report_specs = [
        (
            "PRODUCT",
            products[22].id,
            "DESCRIPTION_MISMATCH",
            "PENDING",
            "【演示】配件说明需要补充，等待平台查看。",
        ),
        (
            "ORDER",
            disputed.id,
            "VIOLATION",
            "PROCESSING",
            "【演示】见面验货产生分歧，平台正在核对。",
        ),
        (
            "PRODUCT",
            products[24].id,
            "DESCRIPTION_MISMATCH",
            "RESOLVED",
            "【演示】发现描述缺失，已提示卖家并下架待补充。",
        ),
        (
            "PRODUCT",
            products[14].id,
            "FAKE_PRODUCT",
            "REJECTED",
            "【演示】核对聊天与交接说明后，现有材料不足以支持举报。",
        ),
    ]
    for target_type, target_id, reason, status, description in report_specs:
        handled = status in ("RESOLVED", "REJECTED")
        report = Report(
            reporter_id=buyer.id,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            description=description,
            evidence={"keys": [evidence[buyer.id]]},
            status=status,
            handled_by=admin.id if handled else None,
            handled_at=now - timedelta(hours=4) if handled else None,
            resolution_note=description if handled else None,
            created_at=now - timedelta(days=1),
        )
        db.add(report)
        db.flush()
        if handled:
            notify(db, buyer.id, "REPORT_RESULT", "/report", "演示举报处理结果", description)
            db.add(
                AuthAudit(
                    actor_id=admin.id,
                    target_id=seller.id,
                    event="admin_report_resolve",
                    request_id="synthetic-demo-v1",
                    context={
                        "syntheticDemo": VERSION,
                        "reportId": report.id,
                        "reason": description,
                        "before": {"status": "PENDING"},
                        "after": {"status": status},
                    },
                    created_at=now - timedelta(hours=4),
                )
            )

    for index, (user, action, outcome) in enumerate(
        (
            (seller, "WARNING", "PENDING"),
            (buyer, "WARNING", "UPHELD"),
            (seller, "DISABLE", "REVOKED"),
        )
    ):
        revoked = outcome == "REVOKED"
        decision = AccountDecision(
            user_id=user.id,
            actor_id=admin.id,
            action=action,
            reason="【合成演示】商品说明待完善。"
            if user == seller
            else "【合成演示】见面时间变更未及时说明。",
            facts="【非真实违规】本记录用于展示警告、申诉和恢复账号流程。",
            basis="演示规则：说明完整、校内交接、及时沟通。",
            occurred_at=now - timedelta(days=4 - index),
            evidence=[evidence[admin.id]],
            reference={"productId": products[24].id, "title": products[24].title}
            if user == seller
            else None,
            created_at=now - timedelta(days=3 - index),
            revoked_at=now - timedelta(hours=6) if revoked else None,
            revoked_by=admin.id if revoked else None,
            revocation_reason="【演示】申诉成立，账号已恢复。" if revoked else None,
        )
        db.add(decision)
        db.flush()
        appeal = AccountAppeal(
            decision_id=decision.id,
            explanation="【合成演示申诉】已补充说明，请管理员复核。",
            evidence=[evidence[user.id]],
            status=outcome,
            created_at=decision.created_at + timedelta(hours=1),
            reviewed_at=now - timedelta(hours=6) if outcome != "PENDING" else None,
            reviewed_by=admin.id if outcome != "PENDING" else None,
            review_reason="【演示】核对材料后记录本次复核结果。" if outcome != "PENDING" else None,
        )
        db.add(appeal)
        db.flush()
        notify(
            db,
            user.id,
            "ACCOUNT_ACTION",
            f"/account/decisions/{decision.id}",
            "演示账号已恢复" if revoked else "演示账号警告",
            decision.reason,
        )
        notify(
            db,
            admin.id,
            "APPEAL_RECEIVED",
            f"/admin/appeals?appeal={appeal.id}",
            "演示账号申诉",
            "【合成记录】可查看证据与处理进度。",
        )
        if outcome != "PENDING":
            notify(
                db,
                user.id,
                "APPEAL_RESULT",
                f"/account/decisions/{decision.id}",
                "演示申诉结果",
                "【演示】已撤销原处理" if revoked else "【演示】维持警告",
            )
        db.add(
            AuthAudit(
                actor_id=admin.id,
                target_id=user.id,
                event="admin_account_decision",
                request_id="synthetic-demo-v1",
                context={
                    "syntheticDemo": VERSION,
                    "decisionId": decision.id,
                    "reason": decision.reason,
                },
                created_at=decision.created_at,
            )
        )
    db.add(
        AuthAudit(
            actor_id=admin.id,
            target_id=seller.id,
            event="admin_product_visibility",
            request_id="synthetic-demo-v1",
            context={
                "syntheticDemo": VERSION,
                "productId": products[24].id,
                "reason": "【演示】描述不完整，暂时下架。",
                "before": {"status": "ON_SALE"},
                "after": {"status": "HIDDEN"},
            },
            created_at=now - timedelta(hours=5),
        )
    )
    for user in (seller, buyer):
        notify(
            db,
            user.id,
            "MESSAGE",
            f"/chat/{sessions[-1].id}",
            "演示聊天未读消息",
            "【合成记录】多件商品与同一联系人集中显示。",
        )
    db.flush()
    for session in sessions:
        session.last_message_at = db.scalar(
            select(func.max(ChatMessage.created_at)).where(ChatMessage.session_id == session.id)
        )
        session.updated_at = session.last_message_at
    return {
        "products": len(products),
        "completedOrders": len(orders),
        "accounts": [user.email for user in created_users],
    }


def initialize(db, items, *, into_local=False):
    db.execute(text("SELECT pg_advisory_xact_lock(68110351)"))
    emails = EMAILS[:2] if into_local else EMAILS
    accounts = db.scalars(select(User).where(User.email.in_(emails))).all()
    if accounts:
        seller = next((user for user in accounts if user.email == EMAILS[0]), None)
        count = db.scalar(
            select(func.count())
            .select_from(Product)
            .where(
                Product.owner_id == seller.id if seller else False,
                Product.attributes["syntheticDemo"].astext == VERSION,
            )
        )
        if (
            len(accounts) != len(emails)
            or count != 25
            or any(
                user.role != ("ADMIN" if user.email == EMAILS[2] else "USER") for user in accounts
            )
        ):
            raise RuntimeError(
                "Demo account collision or incomplete dataset; existing records preserved."
            )
        return {"alreadyInitialized": True}
    administrator = None
    if into_local:
        administrator = db.scalar(
            select(User)
            .where(User.role == "ADMIN", User.status == "ACTIVE")
            .order_by(User.id)
            .limit(1)
        )
        if administrator is None:
            raise RuntimeError(
                "Initialize the local marketplace administrator before importing demo accounts."
            )
    elif db.scalar(select(User.id).limit(1)) is not None:
        raise RuntimeError("Existing database is not this demo dataset; no records changed.")
    return create_demo(db, items, administrator=administrator)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--into-local",
        action="store_true",
        help="Add the two demo users to the existing local marketplace without replacing its data.",
    )
    args = parser.parse_args()
    guard(get_settings(), into_local=args.into_local)
    items = catalog()
    with session_scope() as db:
        print(json.dumps(initialize(db, items, into_local=args.into_local), ensure_ascii=False))


if __name__ == "__main__":
    main()
