"""Build a privacy-minimized L3 price dataset from an authorized order export.

The raw export is deliberately not a repository asset.  This module rejects
unknown fields, records why ineligible orders were excluded, pseudonymizes the
only source reference with HMAC, and fails closed until M5 and M6 approvals are
present in a separately versioned authorization artifact.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import hmac
import json
import os
from pathlib import Path
from typing import Any

from scripts.m8_phase2.pipeline import DataError, validate_timestamp

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "contracts/m8-phase4/readiness-policy.json"
AUTHORIZATION = ROOT / "data/m8-phase4/authorization-status.json"

REQUIRED_EXPORT_FIELDS = {
    "schemaVersion", "orderReference", "status", "buyerConfirmedComplete",
    "sellerConfirmedComplete", "amountFen", "category", "brand", "model",
    "condition", "originalPriceFen", "purchaseAgeMonths", "accessoryState",
    "defectTags", "listedAt", "completedAt", "extractedAt", "refundStatus",
    "disputeStatus", "invalidated",
}
FORBIDDEN_IDENTITY_FIELDS = {
    "buyerId", "sellerId", "name", "email", "studentId", "phone",
    "exactLocation", "chatText", "reportEvidence", "adminNote", "deviceId",
}


def _json(path: Path) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DataError(f"{path}: invalid JSON: {exc}") from exc


def _jsonl(path: Path) -> list[dict]:
    rows = []
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise DataError(f"{path}: cannot read export: {exc}") from exc
    for number, line in enumerate(lines, 1):
        if not line.strip():
            raise DataError(f"{path.name}:{number}: blank row")
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise DataError(f"{path.name}:{number}: invalid JSON") from exc
        if not isinstance(row, dict):
            raise DataError(f"{path.name}:{number}: row must be an object")
        rows.append(row)
    if not rows:
        raise DataError(f"{path.name}: empty export")
    return rows


def _sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def authorization_check(authorization: dict, policy: dict) -> dict:
    """Return an auditable, fail-closed authorization result."""
    reasons = []
    if authorization.get("authorizationVersion") != policy["requiredAuthorizationVersion"]:
        reasons.append("authorization-version")
    if authorization.get("sourceId") != policy["requiredSourceId"]:
        reasons.append("authorization-source")
    if authorization.get("purpose") != policy["requiredAuthorizationPurpose"]:
        reasons.append("authorization-purpose")
    if authorization.get("status") != "APPROVED":
        reasons.append("authorization-status")
    if authorization.get("dataMinimizationConfirmed") is not True:
        reasons.append("data-minimization")
    retention = authorization.get("retentionDays")
    if not isinstance(retention, int) or isinstance(retention, bool) or not 1 <= retention <= 365:
        reasons.append("retention-window")
    approved_fields = authorization.get("approvedFields")
    if (not isinstance(approved_fields, list)
            or not all(isinstance(field, str) for field in approved_fields)
            or set(approved_fields) != REQUIRED_EXPORT_FIELDS):
        reasons.append("approved-fields")
    approvals = authorization.get("approvals")
    for owner in policy["requiredApprovals"]:
        approval = approvals.get(owner) if isinstance(approvals, dict) else None
        if not isinstance(approval, dict):
            reasons.append(f"approval-{owner}")
            continue
        if not all(isinstance(approval.get(field), str) and approval[field].strip()
                   for field in ("approver", "approvedAt", "evidence")):
            reasons.append(f"approval-{owner}")
            continue
        try:
            validate_timestamp(approval["approvedAt"], f"approvals.{owner}.approvedAt")
        except DataError:
            reasons.append(f"approval-{owner}-timestamp")
    return {"passed": not reasons, "reasonCodes": reasons}


def _validate_shape(row: dict, policy: dict, seen: set[str]) -> None:
    missing = REQUIRED_EXPORT_FIELDS - row.keys()
    extra = row.keys() - REQUIRED_EXPORT_FIELDS
    if missing:
        raise DataError(f"missing fields: {sorted(missing)}")
    if extra:
        identity = sorted(extra & FORBIDDEN_IDENTITY_FIELDS)
        if identity:
            raise DataError(f"forbidden identity fields: {identity}")
        raise DataError(f"unknown fields: {sorted(extra)}")
    reference = row["orderReference"]
    if not isinstance(reference, str) or not reference.strip() or reference != reference.strip() or reference in seen:
        raise DataError("duplicate/invalid orderReference")
    seen.add(reference)
    if row["schemaVersion"] != policy["authorizedOrderSchemaVersion"]:
        raise DataError("authorized order schema mismatch")
    if row["status"] not in {"COMPLETED", "CANCELLED", "DISPUTED"}:
        raise DataError("invalid order status")
    if row["refundStatus"] not in {"NONE", "REQUESTED", "APPROVED", "COMPLETED", "REJECTED"}:
        raise DataError("invalid refund status")
    if row["disputeStatus"] not in {"NONE", "OPEN", "RESOLVED"}:
        raise DataError("invalid dispute status")
    if any(not isinstance(row[field], bool) for field in ("buyerConfirmedComplete", "sellerConfirmedComplete", "invalidated")):
        raise DataError("completion and invalidation flags must be boolean")
    if row["category"] not in policy["requiredCategorySlices"]:
        raise DataError("unsupported category")
    if row["condition"] not in {"new", "like_new", "good", "fair"}:
        raise DataError("invalid condition")
    if row["accessoryState"] not in {"complete", "partial", "unknown"}:
        raise DataError("invalid accessoryState")
    if not isinstance(row["defectTags"], list) or not all(isinstance(tag, str) and tag for tag in row["defectTags"]):
        raise DataError("defectTags must contain non-empty strings")
    if len(row["defectTags"]) != len(set(row["defectTags"])):
        raise DataError("defectTags must be unique")
    if any(row[field] is not None and not isinstance(row[field], str) for field in ("brand", "model")):
        raise DataError("brand and model must be strings or null")
    amount = row["amountFen"]
    if not isinstance(amount, int) or isinstance(amount, bool) or not 0 < amount <= 9_999_999_999:
        raise DataError("invalid amountFen")
    original = row["originalPriceFen"]
    if original is not None and (not isinstance(original, int) or isinstance(original, bool)
                                 or not 0 < original <= 9_999_999_999):
        raise DataError("invalid originalPriceFen")
    age = row["purchaseAgeMonths"]
    if age is not None and (not isinstance(age, int) or isinstance(age, bool) or not 0 <= age <= 600):
        raise DataError("invalid purchaseAgeMonths")
    listed = validate_timestamp(row["listedAt"], "listedAt")
    completed = validate_timestamp(row["completedAt"], "completedAt", nullable=True)
    extracted = validate_timestamp(row["extractedAt"], "extractedAt")
    if listed > extracted or (completed is not None and not listed <= completed <= extracted):
        raise DataError("invalid event chronology")


def _eligibility_reason(row: dict, policy: dict) -> str | None:
    if row["status"] != policy["eligibleOrderStatus"]:
        return "ORDER_NOT_COMPLETED"
    if row["buyerConfirmedComplete"] is not True or row["sellerConfirmedComplete"] is not True:
        return "BILATERAL_COMPLETION_MISSING"
    if row["completedAt"] is None:
        return "COMPLETION_TIME_MISSING"
    if row["refundStatus"] != policy["eligibleRefundStatus"]:
        return "REFUND_HISTORY_PRESENT"
    if row["disputeStatus"] != policy["eligibleDisputeStatus"]:
        return "DISPUTE_HISTORY_PRESENT"
    if row["invalidated"] is not False:
        return "ORDER_INVALIDATED"
    return None


def _sample_id(reference: str, key: bytes) -> str:
    return "m8-l3-" + hmac.new(key, reference.encode("utf-8"), hashlib.sha256).hexdigest()[:24]


def build_snapshot(rows: list[dict], authorization: dict, policy: dict, key: bytes) -> tuple[list[dict], dict]:
    """Validate, filter and pseudonymize records; never return raw order references."""
    auth = authorization_check(authorization, policy)
    if not auth["passed"]:
        raise DataError("authorization gate failed: " + ", ".join(auth["reasonCodes"]))
    if len(key) < 32:
        raise DataError("pseudonymization key must contain at least 32 bytes")
    seen: set[str] = set()
    eligible = []
    rejected = Counter()
    for number, row in enumerate(rows, 1):
        try:
            _validate_shape(row, policy, seen)
        except DataError as exc:
            raise DataError(f"row {number}: {exc}") from exc
        reason = _eligibility_reason(row, policy)
        if reason:
            rejected[reason] += 1
            continue
        eligible.append({
            "sampleId": _sample_id(row["orderReference"], key),
            "schemaVersion": policy["requiredSchemaVersion"],
            "sourceId": policy["requiredSourceId"],
            "sourceType": "completed_order",
            "licenseStatus": "approved",
            "labelLevel": "L3_COMPLETED_TRANSACTION",
            "category": row["category"],
            "brand": row["brand"],
            "model": row["model"],
            "condition": row["condition"],
            "originalPriceFen": row["originalPriceFen"],
            "listingPriceFen": None,
            "acceptedOfferPriceFen": None,
            "transactionPriceFen": row["amountFen"],
            "purchaseAgeMonths": row["purchaseAgeMonths"],
            "accessoryState": row["accessoryState"],
            "defectTags": row["defectTags"],
            "listedAt": row["listedAt"],
            "completedAt": row["completedAt"],
            "extractedAt": row["extractedAt"],
            "expectedStatus": "LOW_CONFIDENCE" if row["originalPriceFen"] is not None else "INSUFFICIENT_DATA",
        })
    category_counts = Counter(row["category"] for row in eligible)
    missing_slices = {
        category: policy["minimumSliceCount"] - category_counts.get(category, 0)
        for category in policy["requiredCategorySlices"]
        if category_counts.get(category, 0) < policy["minimumSliceCount"]
    }
    training_allowed = len(eligible) >= policy["minimumL3Count"] and not missing_slices
    report = {
        "decision": "READY_TO_FREEZE" if training_allowed else "NO_GO",
        "candidateTrainingAllowed": training_allowed,
        "counts": {
            "input": len(rows), "eligibleL3": len(eligible),
            "rejected": sum(rejected.values()), "byCategory": dict(sorted(category_counts.items())),
        },
        "rejectionReasons": dict(sorted(rejected.items())),
        "missingCategorySamples": missing_slices,
        "privacy": {
            "rawOrderReferenceRetained": False,
            "identityFieldsAllowed": False,
            "pseudonymization": "HMAC-SHA256",
            "keyFingerprint": hashlib.sha256(key).hexdigest()[:16],
        },
    }
    return eligible, report


def write_snapshot(input_path: Path, output_dir: Path, authorization_path: Path, key: bytes) -> dict:
    input_path = Path(input_path).resolve()
    try:
        input_path.relative_to(ROOT.resolve())
    except ValueError:
        pass
    else:
        raise DataError("raw authorized export must stay outside the repository")
    policy = _json(POLICY)
    authorization = _json(authorization_path)
    rows = _jsonl(input_path)
    samples, report = build_snapshot(rows, authorization, policy, key)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    samples_path = output_dir / "price-l3-snapshot.jsonl"
    samples_path.write_text("".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in samples), encoding="utf-8", newline="\n")
    manifest = {
        **report,
        "datasetVersion": policy["requiredDatasetVersion"],
        "schemaVersion": policy["requiredSchemaVersion"],
        "policyVersion": policy["policyVersion"],
        "snapshotAsOf": max(row["extractedAt"] for row in rows),
        "hashes": {
            "rawExportSha256": _sha256(input_path),
            "authorizationSha256": _sha256(authorization_path),
            "policySha256": _sha256(POLICY),
            "snapshotSha256": _sha256(samples_path),
        },
    }
    (output_dir / "snapshot-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("inspect-authorization")
    build = subparsers.add_parser("build")
    build.add_argument("--input", type=Path, required=True, help="Authorized minimized JSONL outside this repository")
    build.add_argument("--output-dir", type=Path, required=True)
    build.add_argument("--authorization", type=Path, default=AUTHORIZATION)
    args = parser.parse_args()
    policy = _json(POLICY)
    if args.command == "inspect-authorization":
        result = authorization_check(_json(AUTHORIZATION), policy)
        print(json.dumps({"decision": "AUTHORIZED" if result["passed"] else "NO_GO", **result}, indent=2))
        raise SystemExit(0 if result["passed"] else 2)
    key = os.environ.get("M8_PSEUDONYMIZATION_KEY", "").encode("utf-8")
    manifest = write_snapshot(args.input, args.output_dir, args.authorization, key)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    raise SystemExit(0 if manifest["candidateTrainingAllowed"] else 2)


if __name__ == "__main__":
    try:
        main()
    except DataError as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(2) from exc
