"""The administrator console must report the same facts students see on the market."""

import pytest

from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_governance_api import administrator_account, audit_rows, report_user
from tests.test_transaction_api import key_headers, pending_order, product

pytestmark = [pytest.mark.integration, requires_postgres]


def dashboard(client, admin, days=7):
    response = client.get("/admin/dashboard", headers=headers(admin), params={"days": days})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def market_total(client, **params):
    response = client.get("/products", params={"pageSize": 1, **params})
    assert response.status_code == 200, response.text
    return response.json()["data"]["pagination"]["total"]


def test_console_requires_an_administrator(client):
    user = account(client)
    for path in ("/admin/dashboard", "/admin/orders", "/admin/audit-logs"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=headers(user)).status_code == 403
    admin = administrator_account(client)
    assert (
        client.get("/admin/dashboard", headers=headers(admin), params={"days": 14}).status_code
        == 422
    )


def test_on_sale_figures_match_the_public_market(client):
    admin, seller = administrator_account(client), account(client)
    before = dashboard(client, admin)
    product(client, seller)
    after = dashboard(client, admin)
    assert after["products"]["newToday"] == before["products"]["newToday"] + 1
    assert after["products"]["newInRange"] == before["products"]["newInRange"] + 1
    assert after["trend"][-1]["newProducts"] == before["trend"][-1]["newProducts"] + 1
    assert len(after["trend"]) == 7 and after["trend"][0]["date"] == after["rangeStart"]
    assert after["products"]["onSale"] == market_total(client)
    for row in after["categories"]:
        assert row["count"] == market_total(client, category=row["key"]), row
    assert sum(sum(row) for row in after["postingHeatmap"]["cells"]) >= 1
    assert len(dashboard(client, admin, days=30)["trend"]) == 30


def test_moderation_and_reports_flow_into_todo_health_and_decision_log(client):
    admin, seller, reporter = administrator_account(client), account(client), account(client)
    item = product(client, seller)
    before = dashboard(client, admin)
    hidden = client.post(
        f'/admin/products/{item["id"]}/moderation',
        headers=key_headers(admin),
        json={"hidden": True, "reason": "Console check", "expectedUpdatedAt": item["updatedAt"]},
    )
    assert hidden.status_code == 200, hidden.text
    report = report_user(client, reporter, seller)
    middle = dashboard(client, admin)
    assert middle["products"]["onSale"] == before["products"]["onSale"] - 1 == market_total(client)
    assert middle["products"]["moderationHeld"] == before["products"]["moderationHeld"] + 1
    assert middle["pending"]["openReports"] == before["pending"]["openReports"] + 1
    assert middle["health"]["reportsHandled"]["denominator"] == (
        before["health"]["reportsHandled"]["denominator"] + 1
    )
    assert (
        seller["user"]["id"] in [row["id"] for row in middle["riskUsers"]]
        or len(middle["riskUsers"]) == 5
    )
    resolved = client.post(
        f'/admin/reports/{report["id"]}/resolve',
        headers=key_headers(admin),
        json={"resolution": "RESOLVED", "note": "Handled from the console"},
    )
    assert resolved.status_code == 200, resolved.text
    after = dashboard(client, admin)
    assert after["pending"]["openReports"] == before["pending"]["openReports"]
    assert report["id"] not in [row["id"] for row in after["todo"] if row["kind"] == "REPORT"]
    assert after["health"]["reportsHandled"]["numerator"] == (
        middle["health"]["reportsHandled"]["numerator"] + 1
    )
    reasons = [row["reason"] for row in after["recentDecisions"]]
    assert "Handled from the console" in reasons and "Console check" in reasons

    log = client.get("/admin/audit-logs", headers=headers(admin)).json()["data"]
    assert all(row["decision"] for row in log["items"])
    moderation = next(row for row in log["items"] if row["reason"] == "Console check")
    assert moderation["subject"] == {"type": "PRODUCT", "id": item["id"]}
    assert moderation["actor"]["id"] == admin["user"]["id"]
    assert moderation["resultStatus"] == "HIDDEN"
    everything = client.get(
        "/admin/audit-logs", headers=headers(admin), params={"scope": "all", "pageSize": 100}
    ).json()["data"]["items"]
    assert any(row["event"] == "admin_dashboard_read" for row in everything)
    assert audit_rows(admin, "admin_audit_logs_read")

    # The personal centre lists only the signed-in administrator's own decisions.
    colleague = administrator_account(client)
    mine = client.get(
        "/admin/audit-logs", headers=headers(admin), params={"mine": True, "pageSize": 100}
    ).json()["data"]
    assert mine["items"] and all(row["actor"]["id"] == admin["user"]["id"] for row in mine["items"])
    theirs = client.get(
        "/admin/audit-logs", headers=headers(colleague), params={"mine": True}
    ).json()["data"]
    assert theirs["pagination"]["total"] == 0


def test_order_oversight_matches_the_trade_and_the_dashboard(client):
    admin, seller, buyer = administrator_account(client), account(client), account(client)
    before = dashboard(client, admin)
    item, _, order = pending_order(client, seller, buyer)
    after = dashboard(client, admin)
    assert after["orders"]["newToday"] == before["orders"]["newToday"] + 1
    assert after["trend"][-1]["newOrders"] == before["trend"][-1]["newOrders"] + 1
    latest = after["recentOrders"][0]
    assert latest["id"] == order["id"] and latest["productTitle"] == item["title"]
    assert latest["amount"] == order["amount"]

    by_id = client.get(
        "/admin/orders", headers=headers(admin), params={"query": f'#{order["id"]}'}
    ).json()["data"]
    assert order["id"] in [row["id"] for row in by_id["items"]]
    by_status = client.get(
        "/admin/orders",
        headers=headers(admin),
        params={"status": "COMPLETED", "query": str(order["id"])},
    ).json()["data"]
    assert order["id"] not in [row["id"] for row in by_status["items"]]
    assert audit_rows(admin, "admin_orders_read")
