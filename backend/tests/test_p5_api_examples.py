"""Version, enum and executable example contract checks; no deployment claims."""

import json
from datetime import timedelta
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from app.api.routes.intelligence import PriceInput
from app.core.security import utcnow
from app.main import app
from app.models import enums
from app.schemas import business

ROOT = Path(__file__).resolve().parents[2]
SPEC = yaml.safe_load((ROOT / "openapi/campusloop.v1.yaml").read_text(encoding="utf-8"))
EXAMPLES = json.loads(
    (ROOT / "docs/evidence/phase-5/backend-platform/examples/m6-api-examples.json").read_text(
        encoding="utf-8"
    )
)
URI = "urn:campusloop:p5"
REGISTRY = Registry().with_resource(
    URI, Resource.from_contents(SPEC, default_specification=DRAFT202012)
)


def validate(name, body):
    Draft202012Validator({"$ref": f"{URI}#/components/schemas/{name}"}, registry=REGISTRY).validate(
        body
    )


def test_candidate_version_matches_fastapi_and_examples():
    assert SPEC["info"]["version"] == app.version == EXAMPLES["contractVersion"] == "0.5.0-rc.1"


@pytest.mark.parametrize(
    "name",
    [
        "Role",
        "ProductStatus",
        "WantedStatus",
        "OfferStatus",
        "OrderStatus",
        "ReportStatus",
        "ReportTargetType",
        "ReportReason",
        "NotificationType",
    ],
)
def test_release_enums_match_runtime(name):
    assert set(SPEC["components"]["schemas"][name]["enum"]) == {
        v.value for v in getattr(enums, name)
    }


@pytest.mark.parametrize("example", EXAMPLES["requests"])
def test_documented_requests_parse_in_both_contract_and_runtime(example):
    validate(example["schema"], example["body"])
    model = PriceInput if example["model"] == "PriceInput" else getattr(business, example["model"])
    model.model_validate(example["body"])


def test_meetup_example_uses_future_local_time_and_rejects_offset():
    body = {
        **EXAMPLES["meetup"],
        "scheduledDate": (utcnow() + timedelta(days=2)).date().isoformat(),
    }
    validate("MeetupWriteRequest", body)
    business.MeetupWrite.model_validate(body)
    check = Draft202012Validator(SPEC["components"]["schemas"]["MeetupWriteRequest"])
    assert not check.is_valid({**body, "timeSlotStart": "13:00:00Z"})


def test_unavailable_price_is_null_and_low_confidence_is_supported():
    validate("PriceAdvice", EXAMPLES["priceResponse"])
    validate(
        "PriceAdvice",
        {
            **EXAMPLES["priceResponse"],
            "status": "LOW_CONFIDENCE",
            "lower": 10,
            "upper": 20,
            "method": "rule",
        },
    )


def test_m6_documented_operations_exist_in_current_runtime():
    runtime = app.openapi()["paths"]
    for path, entry in SPEC["paths"].items():
        for method in ("get", "post", "patch", "put", "delete"):
            if method in entry:
                if path in ("/admin/reports", "/admin/reports/{reportId}/resolve"):
                    continue  # Explicit upstream gap tested separately, not an M6 route.
                assert path in runtime and method in runtime[path], (method, path)
                if path not in ("/health", "/ready"):
                    assert entry[method]["operationId"] == runtime[path][method]["operationId"]


@pytest.mark.xfail(
    strict=True,
    reason="M5 integration missing from supplied P5 base; remove marker after upstream merge and rerun",
)
def test_group_release_requires_m5_documented_routes():
    runtime = app.openapi()["paths"]
    assert "/admin/reports" in runtime and "/admin/reports/{reportId}/resolve" in runtime


def test_idempotency_key_schema_matches_whitespace_and_length_boundary():
    check = Draft202012Validator(SPEC["components"]["parameters"]["IdempotencyKey"]["schema"])
    assert check.is_valid("p5-example-123")
    for key in ("", " \t", "x" * 65):
        assert not check.is_valid(key)
