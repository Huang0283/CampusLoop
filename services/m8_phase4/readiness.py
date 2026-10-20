"""Fail-closed data readiness gate for the Phase 4 price candidate."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "contracts/m8-phase4/readiness-policy.json"
MANIFEST = ROOT / "data/m8-phase2/derived/manifest.json"
SOURCES = ROOT / "data/m8-phase2/raw/source-register.json"
SAMPLES = ROOT / "data/m8-phase2/raw/price-samples.jsonl"
MODEL_GATES = ROOT / "contracts/intelligence-phase2/model-gates.candidate.json"


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
) -> dict:
    policy = _json(Path(policy_path))
    manifest = _json(Path(manifest_path))
    source_register = _json(Path(sources_path))
    records = _jsonl(Path(samples_path))
    gates = _json(Path(model_gates_path))
    price_gate = next(item for item in gates["capabilities"] if item["capability"] == "price-model")
    l3 = [item for item in records if item.get("labelLevel") == "L3_COMPLETED"]
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
            "id": "sensitive-field-exclusion",
            "passed": not forbidden,
            "observed": forbidden,
            "required": [],
        },
        {
            "id": "minimum-category-slices",
            "passed": bool(category_counts) and all(count >= policy["minimumSliceCount"] for count in category_counts.values()),
            "observed": dict(sorted(category_counts.items())),
            "required": policy["minimumSliceCount"],
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
        "inputHashes": {
            str(Path(manifest_path).relative_to(ROOT)).replace("\\", "/"): _sha256(Path(manifest_path)),
            str(Path(sources_path).relative_to(ROOT)).replace("\\", "/"): _sha256(Path(sources_path)),
            str(Path(samples_path).relative_to(ROOT)).replace("\\", "/"): _sha256(Path(samples_path)),
            str(Path(model_gates_path).relative_to(ROOT)).replace("\\", "/"): _sha256(Path(model_gates_path)),
        },
        "safety": {
            "listingPriceUsedAsLabel": False,
            "acceptedOfferUsedAsLabel": False,
            "sensitiveFieldsFound": forbidden,
        },
    }
