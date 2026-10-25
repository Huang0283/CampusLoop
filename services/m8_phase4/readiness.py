"""Fail-closed data readiness gate for the Phase 4 price candidate."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any
from scripts.m8_phase2.pipeline import DataError, validate_row, validate_sources
from .transaction_dataset import authorization_check

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "contracts/m8-phase4/readiness-policy.json"
MANIFEST = ROOT / "data/m8-phase2/derived/manifest.json"
SOURCES = ROOT / "data/m8-phase2/raw/source-register.json"
SAMPLES = ROOT / "data/m8-phase2/raw/price-samples.jsonl"
MODEL_GATES = ROOT / "contracts/intelligence-phase2/model-gates.candidate.json"
AUTHORIZATION = ROOT / "data/m8-phase4/authorization-status.json"


def _json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect(
    policy_path: Path = POLICY,
    manifest_path: Path = MANIFEST,
    sources_path: Path = SOURCES,
    samples_path: Path = SAMPLES,
    model_gates_path: Path = MODEL_GATES,
    authorization_path: Path = AUTHORIZATION,
) -> dict:
    policy = _json(Path(policy_path))
    manifest = _json(Path(manifest_path))
    source_register = _json(Path(sources_path))
    records = _jsonl(Path(samples_path))
    gates = _json(Path(model_gates_path))
    authorization = _json(Path(authorization_path))
    authorization_result = authorization_check(authorization, policy)
    price_gate = next(item for item in gates["capabilities"] if item["capability"] == "price-model")
    invalid_records = []
    l3 = []
    try:
        sources = validate_sources(source_register)
        seen = set()
        for row in records:
            validate_row(row, sources, seen)
            if row["labelLevel"] == "L3_COMPLETED_TRANSACTION" and row["sourceId"] == policy["requiredSourceId"]:
                l3.append(row)
    except (DataError, AttributeError, TypeError) as exc:
        invalid_records.append(type(exc).__name__)
    source = next((item for item in source_register["sources"] if item["sourceId"] == policy["requiredSourceId"]), None)
    forbidden = sorted({field for row in records for field in policy["forbiddenFields"] if field in row})
    category_counts = Counter(item.get("category") for item in l3)
    checks = [
        {
            "id": "dataset-version",
            "passed": manifest.get("datasetVersion") == policy["requiredDatasetVersion"],
            "observed": manifest.get("datasetVersion"),
            "required": policy["requiredDatasetVersion"],
        },
        {
            "id": "manifest-schema-version",
            "passed": manifest.get("schemaVersion") == policy["requiredSchemaVersion"],
            "observed": manifest.get("schemaVersion"),
            "required": policy["requiredSchemaVersion"],
        },
        {
            "id": "manifest-input-hashes",
            "passed": manifest.get("inputs", {}).get(Path(samples_path).name) == _sha256(Path(samples_path))
                and manifest.get("inputs", {}).get(Path(sources_path).name) == _sha256(Path(sources_path)),
            "observed": manifest.get("inputs", {}),
            "required": "current sample and source-register SHA-256",
        },
        {
            "id": "dataset-integrity",
            "passed": not invalid_records and manifest.get("recordCount") == len(records)
                and manifest.get("eligibleL3Count") == len(l3),
            "observed": {"invalid": invalid_records, "recordCount": len(records), "manifestRecordCount": manifest.get("recordCount"),
                         "eligibleL3": len(l3), "manifestEligibleL3": manifest.get("eligibleL3Count")},
            "required": "all records valid and manifest counts match",
        },
        {
            "id": "dataset-frozen",
            "passed": price_gate.get("datasetFrozen") is True,
            "observed": price_gate.get("datasetFrozen"),
            "required": True,
        },
        {
            "id": "eligible-l3-count",
            "passed": len(l3) >= policy["minimumL3Count"],
            "observed": len(l3),
            "required": policy["minimumL3Count"],
        },
        {
            "id": "source-license",
            "passed": bool(source and source.get("licenseStatus") == "approved" and source.get("licenseEvidence")),
            "observed": None if source is None else source.get("licenseStatus"),
            "required": "approved with evidence",
        },
        {
            "id": "source-authorization",
            "passed": bool(source and all(owner in source.get("approvals", {}) and source["approvals"][owner] for owner in policy["requiredApprovals"])),
            "observed": None if source is None else source.get("approvals"),
            "required": policy["requiredApprovals"],
        },
        {
            "id": "formal-authorization-artifact",
            "passed": authorization_result["passed"],
            "observed": authorization_result["reasonCodes"],
            "required": {
                "version": policy["requiredAuthorizationVersion"],
                "purpose": policy["requiredAuthorizationPurpose"],
                "approvals": policy["requiredApprovals"],
            },
        },
        {
            "id": "sensitive-field-exclusion",
            "passed": not forbidden,
            "observed": forbidden,
            "required": [],
        },
        {
            "id": "minimum-category-slices",
            "passed": all(category_counts.get(category, 0) >= policy["minimumSliceCount"]
                          for category in policy["requiredCategorySlices"]),
            "observed": dict(sorted(category_counts.items())),
            "required": {category: policy["minimumSliceCount"] for category in policy["requiredCategorySlices"]},
        },
    ]
    failed = [item["id"] for item in checks if not item["passed"]]
    return {
        "gateVersion": policy["policyVersion"],
        "decision": "GO_FOR_CANDIDATE_TRAINING" if not failed else "NO_GO",
        "candidateTrainingAllowed": not failed,
        "candidateServingAllowed": False,
        "reasonCodes": failed,
        "checks": checks,
        "counts": {
            "records": len(records),
            "eligibleL3": len(l3),
            "byCategory": dict(sorted(category_counts.items())),
        },
        "inputHashes": {str(path.relative_to(ROOT)).replace("\\", "/") if path.is_relative_to(ROOT) else path.name: _sha256(path)
                         for path in (Path(policy_path), Path(manifest_path), Path(sources_path), Path(samples_path),
                                      Path(model_gates_path), Path(authorization_path))},
        "safety": {
            "listingPriceUsedAsLabel": False,
            "acceptedOfferUsedAsLabel": False,
            "sensitiveFieldsFound": forbidden,
        },
    }
