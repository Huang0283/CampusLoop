"""Preserve in-flight trades when an account loses transaction access."""

from sqlalchemy import select

from app.models import Meetup, Order, Product, User
from app.services.business import event, notify


def protect_disabled_orders(db, user, actor):
    ids = db.execute(
        select(Order.id, Order.product_id)
        .where(
            (Order.buyer_id == user.id) | (Order.seller_id == user.id),
            Order.status.in_(("BOOKED", "PENDING_CONFIRM", "MEETUP_ARRANGED")),
        )
        .order_by(Order.product_id, Order.id)
    ).all()
    for order_id, product_id in ids:
        # Match transaction lock order: product -> order -> meetup.
        db.scalar(select(Product).where(Product.id == product_id).with_for_update())
        order = db.scalar(
            select(Order)
            .where(Order.id == order_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if order.status not in ("BOOKED", "PENDING_CONFIRM", "MEETUP_ARRANGED"):
            continue
        if (
            order.status == "MEETUP_ARRANGED"
            or order.buyer_confirmed_complete
            or order.seller_confirmed_complete
        ):
            description = "交易参与方账号被禁用，订单转入争议，等待管理员核实。"
            event(db, order, actor, description, "DISPUTED", notify_peer=False)
        else:
            description = "交易参与方账号被禁用，可由正常账号一方取消订单。"
            event(db, order, actor, description, notify_peer=False)
        # Admin actors are not order participants; notify both parties explicitly.
        for recipient in (order.buyer_id, order.seller_id):
            notify(db, recipient, "ORDER_STATUS_CHANGED", f"/orders/{order.id}", description)


def cancel_reservation(db, order, actor, reason):
    product = db.get(Product, order.product_id)
    seller = db.get(User, order.seller_id)
    order.cancelled_reason = reason
    # A newer reservation or sale must not be reopened by cancelling an old dispute.
    other = db.scalar(
        select(Order.id)
        .where(
            Order.product_id == product.id,
            Order.id != order.id,
            Order.status.in_(
                ("BOOKED", "PENDING_CONFIRM", "MEETUP_ARRANGED", "COMPLETED", "DISPUTED")
            ),
        )
        .limit(1)
    )
    if other is None and product.status != "SOLD":
        product.status = (
            "HIDDEN"
            if product.deleted_at
            or product.moderation_blocked
            or product.status == "HIDDEN"
            or seller.status != "ACTIVE"
            else "ON_SALE"
        )
    meetup = db.scalar(select(Meetup).where(Meetup.order_id == order.id).with_for_update())
    if meetup:
        meetup.status = "CANCELLED"
    event(db, order, actor, reason, "CANCELLED", notify_peer=False)
    for recipient in (order.buyer_id, order.seller_id):
        notify(
            db, recipient, "ORDER_STATUS_CHANGED", f"/orders/{order.id}", "Order cancelled", reason
        )
