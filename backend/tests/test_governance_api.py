"""M5 Phase 4: real PostgreSQL/Redis, M8 HTTP and protected storage integration."""

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.main import app
from app.models import AuthAudit, IdempotencyRecord, Report, User
from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_live_intelligence import settings  # noqa: F401 -- autouse real RPC servers
from tests.test_transaction_api import image_url, key_headers, pending_order

pytestmark = [pytest.mark.integration, requires_postgres]


def administrator_account(client):
    actor = account(client)
    with SessionLocal() as db:
        db.get(User, actor["user"]["id"]).role = "ADMIN"
        db.commit()
    return actor


def report_user(client, reporter, target, evidence=None):
    response = client.post(
        "/reports",
        headers=key_headers(reporter),
        json={
            "targetType": "USER",
            "targetId": target["user"]["id"],
            "reason": "SPAM",
            "description": "Please review manually.",
            "evidence": evidence or [],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_report_description_matches_database_limit(client):
    reporter, target, second_target = account(client), account(client), account(client)
    base = {
        "targetType": "USER",
        "reason": "SPAM",
        "evidence": [],
    }

    accepted = client.post(
        "/reports",
        headers=key_headers(reporter),
        json=base | {"targetId": target["user"]["id"], "description": "x" * 1000},
    )
    assert accepted.status_code == 201, accepted.text
    assert len(accepted.json()["data"]["description"]) == 1000

    rejected = client.post(
        "/reports",
        headers=key_headers(reporter),
        json=base | {"targetId": second_target["user"]["id"], "description": "x" * 1001},
    )
    assert rejected.status_code == 422, rejected.text
    assert rejected.json()["code"] == "VALIDATION_ERROR"
    assert "body.description" in rejected.json()["details"]["fields"]


def audit_rows(actor, name):
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(AuthAudit)
                .where(
                    AuthAudit.actor_id == actor["user"]["id"],
                    AuthAudit.event == name,
                )
                .order_by(AuthAudit.id)
            )
        )


def assert_read_audit(actor, name):
    rows = audit_rows(actor, name)
    assert rows
    row = rows[-1]
    assert row.created_at and row.request_id and row.context["reason"].strip()
    assert row.context["before"] == row.context["after"]
    return row


def test_trust_visibility_neutral_permissions_and_disabled_target(client):
    owner, other = account(client), account(client)
    admin = administrator_account(client)
    uid = owner["user"]["id"]
    public = client.get(f"/users/{uid}/trust").json()["data"]
    assert public["status"] == "NEW_USER_NEUTRAL" and public["score"] == 3.5
    assert public["visibility"] == "PUBLIC" and public["explanation"]
    assert "smoothing" not in public and "ignoredEventCount" not in public
    assert client.get("/users/me/trust").status_code == 401
    self_view = client.get("/users/me/trust", headers=headers(owner))
    assert self_view.status_code == 200, self_view.text
    assert self_view.headers["Cache-Control"] == "no-store"
    assert self_view.json()["data"]["visibility"] == "SELF"
    assert self_view.json()["data"]["smoothing"] == {"priorScore": 3.5, "priorWeight": 5}
    path = f"/admin/users/{uid}/trust"
    assert client.get(path, headers=headers(other)).status_code == 403
    assert client.get(path).status_code == 401
    result = client.get(path, headers=headers(admin), params={"reason": "appeal review"})
    assert result.status_code == 200, result.text
    assert result.json()["data"]["visibility"] == "ADMIN"
    assert_read_audit(admin, "admin_trust_read")
    assert client.get("/users/9007199254740991/trust").status_code == 404
    assert client.get(path, headers=headers(admin), params={"reason": "  "}).status_code == 422
    changed = client.patch(
        f"/admin/users/{uid}/status",
        headers=headers(admin),
        json={"status": "DISABLED", "reason": "explicit human review"},
    )
    assert changed.status_code == 200, changed.text
    assert client.get(f"/users/{uid}/trust").status_code == 404
    assert client.get("/users/me/trust", headers=headers(owner)).status_code == 423
    assert client.get(path, headers=headers(admin)).status_code == 200
    row = audit_rows(admin, "admin_user_disabled")[-1]
    assert row.context["before"] == {"status": "ACTIVE"}
    assert row.context["after"] == {"status": "DISABLED"}
    assert (
        client.patch(
            f"/admin/users/{uid}/status",
            headers=headers(admin),
            json={"status": "DISABLED", "reason": "rechecked"},
        ).status_code
        == 200
    )
    assert_read_audit(admin, "admin_user_status_unchanged")


def test_completed_review_changes_trust_but_unfinished_trade_does_not(client):
    seller, buyer = account(client), account(client)
    _, _, order = pending_order(client, seller, buyer)
    uid, oid = seller["user"]["id"], order["id"]
    assert client.get(f"/users/{uid}/trust").json()["data"]["validEventCount"] == 0
    meeting = client.post(
        f"/orders/{oid}/meetup",
        headers=key_headers(buyer),
        json={
            "campusLocation": "Library",
            "scheduledDate": (datetime.now(UTC) + timedelta(days=1)).date().isoformat(),
            "timeSlotStart": "13:00:00",
            "timeSlotEnd": "14:00:00",
        },
    ).json()["data"]
    for actor in (buyer, seller):
        response = client.post(
            f"/orders/{oid}/meetup/confirm",
            headers=key_headers(actor),
            json={"meetupId": meeting["id"], "version": meeting["version"]},
        )
        assert response.status_code == 200, response.text
    for actor in (buyer, seller):
        response = client.post(
            f"/orders/{oid}/confirm-complete",
            headers=key_headers(actor),
            json={"meetupVersion": meeting["version"]},
        )
        assert response.status_code == 200, response.text
    assert client.get(f"/users/{uid}/trust").json()["data"]["status"] == "NEW_USER_NEUTRAL"
    review = client.post(
        "/reviews",
        headers=key_headers(buyer),
        json={
            "orderId": oid,
            "overall": 5,
            "descriptionAccuracy": 5,
            "communication": 5,
            "punctuality": 5,
            "comment": "Completed trade",
        },
    )
    assert review.status_code == 201, review.text
    view = client.get(f"/users/{uid}/trust").json()["data"]
    assert view["status"] == "AVAILABLE" and view["validEventCount"] == 1
    assert view["score"] == 3.75


def test_report_queue_private_evidence_and_sensitive_read_audits(client):
    reporter, target, other = account(client), account(client), account(client)
    admin = administrator_account(client)
    evidence = image_url(client, reporter, "evidence")
    report = report_user(client, reporter, target, [evidence])
    report_id = report["id"]
    for actor_headers, expected in (({}, 401), (headers(other), 403)):
        assert client.get("/admin/reports", headers=actor_headers).status_code == expected
        assert (
            client.get(f"/admin/reports/{report_id}/evidence/0", headers=actor_headers).status_code
            == expected
        )
    queue = client.get(
        "/admin/reports", headers=headers(admin), params={"status": "PENDING", "pageSize": 1}
    )
    assert queue.status_code == 200, queue.text
    assert isinstance(queue.json()["data"], list) and len(queue.json()["data"]) == 1
    entry = queue.json()["data"][0]
    assert entry["id"] == report_id
    assert entry["evidence"] == [f"/admin/reports/{report_id}/evidence/0"]
    assert evidence not in queue.text and "reporterId" not in entry
    assert_read_audit(admin, "admin_reports_read")
    assert (
        client.get("/admin/reports", headers=headers(admin), params={"page": 0}).status_code == 422
    )
    assert (
        client.get("/admin/reports", headers=headers(admin), params={"pageSize": 101}).status_code
        == 422
    )
    assert (
        client.get("/admin/reports", headers=headers(admin), params={"status": "BOGUS"}).status_code
        == 422
    )
    image = client.get(entry["evidence"][0], headers=headers(admin))
    assert image.status_code == 200 and image.headers["Cache-Control"] == "no-store"
    assert image.headers["Content-Type"] == "image/jpeg"
    evidence_audit = assert_read_audit(admin, "admin_report_evidence_read")
    assert evidence not in str(evidence_audit.context)
    mine = client.get("/reports/mine", headers=headers(reporter)).json()["data"]
    assert "evidence" not in mine[0] and "handledBy" not in mine[0]
    assert client.get("/reports/mine", headers=headers(other)).json()["data"] == []
    assert client.get("/admin/users", headers=headers(admin)).status_code == 200
    assert_read_audit(admin, "admin_users_read")


def test_resolution_idempotency_and_explicit_override_reject_stale_input(client):
    reporter, target = account(client), account(client)
    admin = administrator_account(client)
    report_id = report_user(client, reporter, target)["id"]
    path = f"/admin/reports/{report_id}/resolve"
    body = {"resolution": "RESOLVED", "note": "confirmed by human"}
    assert client.post(path, json=body).status_code == 401
    assert client.post(path, headers=key_headers(reporter), json=body).status_code == 403
    assert client.post(path, headers=headers(admin), json=body).status_code == 422
    for invalid in (
        {"resolution": "RESOLVED"},
        {**body, "note": " "},
        {**body, "resolution": "PENDING"},
    ):
        assert client.post(path, headers=key_headers(admin), json=invalid).status_code == 422
    h = key_headers(admin)
    first = client.post(path, headers=h, json=body)
    assert first.status_code == 200, first.text
    current = first.json()["data"]
    assert current["handledBy"] == admin["user"]["id"] and current["handledAt"]
    assert client.post(path, headers=h, json=body).json() == first.json()
    assert client.post(path, headers=h, json={**body, "note": "different"}).status_code == 409
    assert client.post(path, headers=key_headers(admin), json=body).status_code == 409
    assert len(audit_rows(admin, "admin_report_resolve")) == 1
    row = audit_rows(admin, "admin_report_resolve")[0]
    assert row.created_at and row.request_id and row.context["reason"] == body["note"]
    assert row.context["before"] == {"status": "PENDING", "handledBy": None, "handledAt": None}
    assert row.context["after"]["status"] == "RESOLVED"
    override_body = {
        "resolution": "REJECTED",
        "note": "appeal accepted by human",
        "expectedStatus": "RESOLVED",
        "expectedHandledAt": current["handledAt"],
    }
    override_path = f"/admin/reports/{report_id}/override"
    for invalid_timestamp in ("2026-10-15T12:00:00", "invalid", 123):
        assert (
            client.post(
                override_path,
                headers=key_headers(admin),
                json={**override_body, "expectedHandledAt": invalid_timestamp},
            ).status_code
            == 422
        )
    oh = key_headers(admin)
    changed = client.post(override_path, headers=oh, json=override_body)
    assert changed.status_code == 200, changed.text
    assert client.post(override_path, headers=oh, json=override_body).json() == changed.json()
    assert (
        client.post(override_path, headers=key_headers(admin), json=override_body).status_code
        == 409
    )
    # An old resolve replay is a historical response; it must never undo the override.
    assert client.post(path, headers=h, json=body).json() == first.json()
    with SessionLocal() as db:
        assert db.get(Report, report_id).status == "REJECTED"
        assert db.get(User, target["user"]["id"]).status == "ACTIVE"
    assert len(audit_rows(admin, "admin_report_override")) == 1
    assert_read_audit(admin, "admin_report_replay")


def test_competing_administrators_only_one_normal_decision_commits(client):
    reporter, target = account(client), account(client)
    admins = [administrator_account(client), administrator_account(client)]
    rid = report_user(client, reporter, target)["id"]

    def submit(index):
        with TestClient(app) as isolated:
            return isolated.post(
                f"/admin/reports/{rid}/resolve",
                headers=key_headers(admins[index]),
                json={"resolution": ("RESOLVED", "REJECTED")[index], "note": "independent review"},
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, range(2)))
    assert sorted(response.status_code for response in responses) == [200, 409]
    assert sum(len(audit_rows(actor, "admin_report_resolve")) for actor in admins) == 1


def test_duplicate_concurrent_request_and_stale_same_status_override(client):
    reporter, target = account(client), account(client)
    admin = administrator_account(client)
    rid = report_user(client, reporter, target)["id"]
    h = key_headers(admin)

    def submit(_):
        with TestClient(app) as isolated:
            return isolated.post(
                f"/admin/reports/{rid}/resolve",
                headers=h,
                json={"resolution": "REJECTED", "note": "insufficient evidence"},
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, range(2)))
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    old = responses[0].json()["data"]
    body = {
        "resolution": "REJECTED",
        "note": "additional human review",
        "expectedStatus": old["status"],
        "expectedHandledAt": old["handledAt"],
    }
    path = f"/admin/reports/{rid}/override"
    assert client.post(path, headers=key_headers(admin), json=body).status_code == 200
    # A status-only comparison would accept this out-of-order write.
    assert client.post(path, headers=key_headers(admin), json=body).status_code == 409


def test_audit_failure_rolls_back_decision_and_idempotency_together(client):
    reporter, target = account(client), account(client)
    admin = administrator_account(client)
    rid = report_user(client, reporter, target)["id"]
    key = str(uuid.uuid4())

    def fail_audit(session, *_):
        if any(
            isinstance(row, AuthAudit) and row.event == "admin_report_resolve"
            for row in session.new
        ):
            raise SQLAlchemyError("Injected audit storage failure")

    event.listen(SessionLocal.class_, "before_flush", fail_audit)
    try:
        result = client.post(
            f"/admin/reports/{rid}/resolve",
            headers=key_headers(admin, key),
            json={"resolution": "RESOLVED", "note": "must commit with audit"},
        )
        assert result.status_code == 503, result.text
    finally:
        event.remove(SessionLocal.class_, "before_flush", fail_audit)
    with SessionLocal() as db:
        report = db.get(Report, rid)
        assert (
            report.status == "PENDING" and report.handled_by is None and report.handled_at is None
        )
        assert not db.scalar(select(IdempotencyRecord).where(IdempotencyRecord.key == key))
    assert not audit_rows(admin, "admin_report_resolve")


def test_reporter_sees_resolution_note_and_receives_result_notification(client):
    reporter, target = account(client), account(client)
    admin = administrator_account(client)
    report = report_user(client, reporter, target)
    note = "confirmed after manual review"
    resolved = client.post(
        f"/admin/reports/{report['id']}/resolve",
        headers=key_headers(admin),
        json={"resolution": "RESOLVED", "note": note},
    )
    assert resolved.status_code == 200, resolved.text

    mine = client.get("/reports/mine", headers=headers(reporter)).json()["data"]
    entry = next(item for item in mine if item["id"] == report["id"])
    assert entry["status"] == "RESOLVED"
    assert entry["handledAt"] == resolved.json()["data"]["handledAt"]
    assert entry["resolutionNote"] == note
    assert "handledBy" not in entry and "evidence" not in entry

    notifications = client.get("/notifications", headers=headers(reporter)).json()["data"]
    result = next(item for item in notifications if item["type"] == "REPORT_RESULT")
    assert result["title"] == "举报已处理"
    assert note in result["content"]

    target_notifications = client.get("/notifications", headers=headers(target)).json()["data"]
    assert all(item["type"] != "REPORT_RESULT" for item in target_notifications)


def test_self_report_is_rejected_before_any_write(client):
    reporter = account(client)
    response = client.post(
        "/reports",
        headers=key_headers(reporter),
        json={
            "targetType": "USER",
            "targetId": reporter["user"]["id"],
            "reason": "SPAM",
            "description": "",
            "evidence": [],
        },
    )
    assert response.status_code == 400, response.text
    assert response.json()["code"] == "SELF_REPORT_FORBIDDEN"
    assert client.get("/reports/mine", headers=headers(reporter)).json()["data"] == []


def test_my_reports_pagination_is_bounded_and_newest_first(client):
    reporter = account(client)
    targets = [account(client) for _ in range(3)]
    ids = [report_user(client, reporter, target)["id"] for target in targets]

    first = client.get(
        "/reports/mine", headers=headers(reporter), params={"page": 1, "pageSize": 2}
    )
    assert first.status_code == 200, first.text
    assert [item["id"] for item in first.json()["data"]] == [ids[2], ids[1]]

    second = client.get(
        "/reports/mine", headers=headers(reporter), params={"page": 2, "pageSize": 2}
    )
    assert [item["id"] for item in second.json()["data"]] == [ids[0]]

    for invalid in ({"page": 0}, {"pageSize": 101}, {"pageSize": 0}):
        assert (
            client.get("/reports/mine", headers=headers(reporter), params=invalid).status_code
            == 422
        )


def test_risk_manual_only_and_model_off_still_allows_moderation(client, monkeypatch):
    reporter, target = account(client), account(client)
    admin = administrator_account(client)
    uid = target["user"]["id"]
    rid = report_user(client, reporter, target)["id"]
    path = f"/admin/users/{uid}/risk-clues"
    assert client.get(path, headers=headers(reporter)).status_code == 403
    result = client.get(path, headers=headers(admin), params={"reason": "manual appeal"})
    assert result.status_code == 200, result.text
    assert result.json()["data"]["enforcementExecuted"] is False
    assert_read_audit(admin, "admin_risk_clues_read")
    monkeypatch.setenv("BASELINE_SERVICES_ENABLED", "false")
    get_settings.cache_clear()
    public = client.get(f"/users/{uid}/trust").json()["data"]
    assert public["status"] == "UNAVAILABLE" and public["degradationReason"] == "SERVICE_DISABLED"
    assert "score" not in public
    risk = client.get(path, headers=headers(admin)).json()["data"]
    assert risk["status"] == "UNAVAILABLE" and risk["enforcementExecuted"] is False
    assert (
        client.post(
            f"/admin/reports/{rid}/resolve",
            headers=key_headers(admin),
            json={"resolution": "REJECTED", "note": "human decision without model"},
        ).status_code
        == 200
    )
    assert client.get("/users/me", headers=headers(target)).json()["data"]["status"] == "ACTIVE"
    assert client.get("/products").status_code == 200


def test_real_http_timeout_degrades_without_changing_business_facts(client, monkeypatch):
    import threading
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    release = threading.Event()

    class Stalled(BaseHTTPRequestHandler):
        def do_POST(self):
            release.wait(3)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Stalled)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    target = account(client)
    admin = administrator_account(client)
    monkeypatch.setenv("M8_SERVICE_URL", f"http://127.0.0.1:{server.server_address[1]}")
    get_settings.cache_clear()
    try:
        trust = client.get(f'/users/{target["user"]["id"]}/trust').json()["data"]
        assert trust["status"] == "UNAVAILABLE" and "score" not in trust
        assert trust["degradationReason"] == "SERVICE_TIMEOUT_OR_UNAVAILABLE"
        risk = client.get(f'/admin/users/{target["user"]["id"]}/risk-clues', headers=headers(admin))
        assert risk.status_code == 200 and not risk.json()["data"]["enforcementExecuted"]
        assert_read_audit(admin, "admin_risk_clues_read")
        assert client.get("/users/me", headers=headers(target)).json()["data"]["status"] == "ACTIVE"
    finally:
        release.set()
        server.shutdown()
        server.server_close()
