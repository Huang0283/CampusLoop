"""H4-02 consumer contract regression; run from repository root with unittest."""

from pathlib import Path
import unittest

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[2]
SPEC = yaml.safe_load((ROOT / "openapi/campusloop.v1.yaml").read_text(encoding="utf-8"))
URI = "urn:campusloop:m6:p4"
REGISTRY = Registry().with_resource(
    URI, Resource.from_contents(SPEC, default_specification=DRAFT202012)
)


def validator(name):
    return Draft202012Validator(
        {"$ref": f"{URI}#/components/schemas/{name}"},
        registry=REGISTRY,
        format_checker=FormatChecker(),
    )


class GovernanceContractTests(unittest.TestCase):
    def test_resolution_requires_a_real_note(self):
        check = validator("ReportResolutionRequest")
        self.assertTrue(
            check.is_valid({"resolution": "RESOLVED", "note": "Reviewed evidence"})
        )
        for note in ("", " \n\t", "x" * 1001, None):
            self.assertFalse(check.is_valid({"resolution": "RESOLVED", "note": note}))
        self.assertFalse(check.is_valid({"resolution": "RESOLVED"}))

    def test_override_requires_previous_terminal_state_and_aware_time(self):
        body = dict(
            resolution="REJECTED",
            note="Correction",
            expectedStatus="RESOLVED",
            expectedHandledAt="2026-10-15T10:00:00+08:00",
        )
        check = validator("ReportOverrideRequest")
        self.assertTrue(check.is_valid(body))
        for field in ("expectedStatus", "expectedHandledAt"):
            self.assertFalse(
                check.is_valid({k: v for k, v in body.items() if k != field})
            )
        self.assertFalse(check.is_valid({**body, "expectedStatus": "PENDING"}))
        self.assertFalse(
            check.is_valid({**body, "expectedHandledAt": "2026-10-15T10:00:00"})
        )

    def test_action_idempotency_accepts_non_uuid_and_rejects_blank(self):
        parameter = SPEC["components"]["parameters"]["ModerationIdempotencyKey"]
        check = Draft202012Validator(parameter["schema"])
        self.assertTrue(parameter["required"])
        self.assertTrue(check.is_valid("m5-report-42-resolve"))
        for key in ("", " \t", "x" * 65):
            self.assertFalse(check.is_valid(key))

    def test_pending_admin_report_allows_protected_relative_evidence(self):
        body = dict(
            id=42,
            targetType="PRODUCT",
            targetId=1,
            reason="SPAM",
            description="Repeated listing",
            status="PENDING",
            createdAt="2026-10-15T10:00:00Z",
            handledBy=None,
            handledAt=None,
            evidence=["/admin/reports/42/evidence/0"],
        )
        self.assertTrue(validator("AdminReport").is_valid(body))
        self.assertTrue(
            validator("AdminReportListResponse").is_valid(
                {"code": 0, "message": "ok", "data": [body]}
            )
        )
        public = SPEC["components"]["schemas"]["Report"]["properties"]
        self.assertFalse({"evidence", "handledBy", "handledAt"} & public.keys())

    def test_governance_routes_keep_security_and_new_sdk_operations(self):
        for path, method, operation_id in (
            ("/users/me/trust", "get", "getMyTrust"),
            ("/admin/users/{userId}/trust", "get", "adminGetUserTrust"),
            ("/admin/reports/{reportId}/override", "post", "overrideReport"),
        ):
            operation = SPEC["paths"][path][method]
            self.assertEqual(operation["operationId"], operation_id)
            self.assertEqual(
                operation.get("security", SPEC["security"]), [{"bearerAuth": []}]
            )
            self.assertIn(
                operation_id,
                (ROOT / "frontend/src/sdk/generated/sdk.gen.ts").read_text(),
            )

    def test_sensitive_read_reasons_reject_whitespace(self):
        for path in (
            "/admin/reports",
            "/admin/users/{userId}/trust",
            "/admin/users/{userId}/risk-clues",
            "/admin/reports/{reportId}/evidence/{imageIndex}",
        ):
            reason = next(
                p
                for p in SPEC["paths"][path]["get"]["parameters"]
                if p.get("name") == "reason"
            )
            check = Draft202012Validator(reason["schema"])
            self.assertTrue(check.is_valid(reason["schema"]["default"]))
            self.assertFalse(check.is_valid(" \t"))
            self.assertFalse(check.is_valid("x" * 501))

    def test_frozen_price_status_is_representable(self):
        body = dict(
            lower=10,
            upper=20,
            currency="CNY",
            factors=[],
            method="rule",
            disclaimer="Reference only",
            resultVersion="m8-price-rule-v1",
            status="LOW_CONFIDENCE",
        )
        self.assertTrue(validator("PriceAdvice").is_valid(body))


if __name__ == "__main__":
    unittest.main()
