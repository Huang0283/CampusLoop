"""Human product moderation must close the loop without bypassing trade state."""

import pytest

from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_governance_api import administrator_account, audit_rows
from tests.test_transaction_api import image_url, key_headers, pending_order, product

pytestmark = [pytest.mark.integration, requires_postgres]


def test_image_only_edit_invalidates_an_administrators_review(client):
    seller, admin = account(client), administrator_account(client)
    item = product(client, seller)
    path = f'/admin/products/{item["id"]}/moderation'
    hidden = client.post(
        path,
        headers=key_headers(admin),
        json={"hidden": True, "reason": "Review image A", "expectedUpdatedAt": item["updatedAt"]},
    ).json()["data"]["product"]
    body = {
        name: hidden[name]
        for name in ("title", "description", "category", "condition", "price", "campusLocation")
    }
    changed = client.patch(
        f'/products/{item["id"]}',
        headers=headers(seller),
        json={**body, "images": [image_url(client, seller)]},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["data"]["updatedAt"] != hidden["updatedAt"]
    stale = client.post(
        path,
        headers=key_headers(admin),
        json={
            "hidden": False,
            "reason": "Reviewed image A",
            "expectedUpdatedAt": hidden["updatedAt"],
        },
    )
    assert stale.status_code == 409, stale.text
    assert stale.json()["code"] == "PRODUCT_STALE"
    assert client.get(f'/products/{item["id"]}').status_code == 404


def test_admin_hide_restore_is_audited_and_owner_cannot_bypass(client):
    seller, admin = account(client), administrator_account(client)
    item = product(client, seller)
    identity = item["id"]
    queue = client.get("/admin/products", headers=headers(admin), params={"query": item["title"]})
    assert queue.status_code == 200, queue.text
    assert identity in [row["product"]["id"] for row in queue.json()["data"]["items"]]
    detail = client.get(f"/admin/products/{identity}", headers=headers(admin))
    assert detail.status_code == 200, detail.text
    body = {
        "hidden": True,
        "reason": "Human review of misleading listing",
        "expectedUpdatedAt": item["updatedAt"],
    }
    request_headers = key_headers(admin)
    path = f"/admin/products/{identity}/moderation"
    hidden = client.post(path, headers=request_headers, json=body)
    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["data"]["moderationBlocked"] is True
    assert client.post(path, headers=request_headers, json=body).json() == hidden.json()
    assert client.get(f"/products/{identity}").status_code == 404
    assert client.get(f"/products/{identity}", headers=headers(seller)).status_code == 200
    assert (
        client.patch(
            f"/products/{identity}/status", headers=headers(seller), json={"status": "ON_SALE"}
        ).status_code
        == 409
    )
    assert client.post(path, headers=key_headers(admin), json=body).status_code == 409
    restored = client.post(
        path,
        headers=key_headers(admin),
        json={
            "hidden": False,
            "reason": "Human review completed",
            "expectedUpdatedAt": hidden.json()["data"]["product"]["updatedAt"],
        },
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()["data"]["product"]["status"] == "ON_SALE"
    assert client.get(f"/products/{identity}").status_code == 200
    rows = audit_rows(admin, "admin_product_moderate")
    assert len(rows) == 2
    assert rows[0].context["reason"] == body["reason"]
    assert rows[0].context["before"]["status"] == "ON_SALE"
    assert rows[0].context["after"]["status"] == "HIDDEN"


def test_product_governance_rejects_guests_users_and_blank_reasons(client):
    seller, admin = account(client), administrator_account(client)
    item = product(client, seller)
    path = f'/admin/products/{item["id"]}'
    body = {"hidden": True, "reason": "manual review", "expectedUpdatedAt": item["updatedAt"]}
    for request_headers, code in (({}, 401), (headers(seller), 403)):
        assert client.get("/admin/products", headers=request_headers).status_code == code
        assert client.get(path, headers=request_headers).status_code == code
        assert (
            client.post(
                path + "/moderation",
                headers={**request_headers, "Idempotency-Key": "access-test"},
                json=body,
            ).status_code
            == code
        )
    assert (
        client.post(
            path + "/moderation", headers=key_headers(admin), json={**body, "reason": " "}
        ).status_code
        == 422
    )
    assert not audit_rows(admin, "admin_product_moderate")


def test_moderation_does_not_change_reserved_goods_or_owner_hidden_state(client):
    seller, buyer, admin = account(client), account(client), administrator_account(client)
    item, _, _ = pending_order(client, seller, buyer)
    detail = client.get(f'/admin/products/{item["id"]}', headers=headers(admin)).json()["data"]
    assert (
        client.post(
            f'/admin/products/{item["id"]}/moderation',
            headers=key_headers(admin),
            json={
                "hidden": True,
                "reason": "must not change active order",
                "expectedUpdatedAt": detail["product"]["updatedAt"],
            },
        ).status_code
        == 409
    )
    own_hidden = product(client, seller)
    changed = client.patch(
        f'/products/{own_hidden["id"]}/status', headers=headers(seller), json={"status": "HIDDEN"}
    ).json()["data"]
    assert (
        client.post(
            f'/admin/products/{changed["id"]}/moderation',
            headers=key_headers(admin),
            json={
                "hidden": False,
                "reason": "cannot publish on behalf of seller",
                "expectedUpdatedAt": changed["updatedAt"],
            },
        ).status_code
        == 409
    )
