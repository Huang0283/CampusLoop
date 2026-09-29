"""M8 Phase 2 deterministic price-data and rule-evaluation pipeline.

Synthetic L0 data validates schema, coverage and reasonableness only.  Prediction
metrics are emitted only when eligible L3 completed-transaction labels exist.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/m8-phase2/raw"
DERIVED = ROOT / "data/m8-phase2/derived"
RULE_VERSION = "price-rule-v1.0-phase2"
DATASET_VERSION = "m8-price-eval-v1"

CONDITION = {
    "new": (0.88, 0.95, 1.00),
    "like_new": (0.75, 0.85, 0.93),
    "good": (0.55, 0.68, 0.80),
    "fair": (0.28, 0.45, 0.62),
}
CATEGORY = {
    "digital": (0.78, 0.25),
    "books": (0.86, 0.30),
    "household": (0.85, 0.25),
    "clothing": (0.75, 0.15),
    "sports": (0.84, 0.25),
    "other": (0.80, 0.20),
}
REQUIRED = {
    "sampleId", "schemaVersion", "sourceId", "sourceType", "licenseStatus",
    "labelLevel", "category", "brand", "model", "condition",
    "originalPriceFen", "listingPriceFen", "acceptedOfferPriceFen",
    "transactionPriceFen", "purchaseAgeMonths", "accessoryState", "defectTags",
    "listedAt", "completedAt", "extractedAt", "expectedStatus",
}


class DataError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise DataError(message)


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DataError(f"{path}: invalid JSON: {exc}") from exc


def read_jsonl(path: Path):
    rows = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        require(bool(line.strip()), f"{path.name}:{number}: blank row")
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise DataError(f"{path.name}:{number}: invalid JSON: {exc}") from exc
    require(bool(rows), f"{path.name}: empty dataset")
    return rows


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")


def write_jsonl(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows), encoding="utf-8", newline="\n")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_timestamp(value, field, nullable=False):
    if value is None and nullable:
        return None
    require(isinstance(value, str) and "T" in value and (value.endswith("Z") or "+" in value[10:]), f"{field}: timezone-qualified timestamp required")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise DataError(f"{field}: invalid timestamp") from exc
    require(parsed.tzinfo is not None, f"{field}: timezone-qualified timestamp required")
    return parsed


def validate_price(value, field):
    require(value is None or (isinstance(value, int) and not isinstance(value, bool) and 0 < value <= 9_999_999_999), f"{field}: expected null or positive integer fen")


def validate_sources(register):
    require(register.get("registerVersion") == "m8-price-source-register-v1", "source register version mismatch")
    sources = register.get("sources")
    require(isinstance(sources, list) and sources, "source register is empty")
    by_id = {}
    for source in sources:
        sid = source.get("sourceId")
        require(isinstance(sid, str) and sid and sid not in by_id, f"duplicate/invalid sourceId: {sid}")
        require(source.get("licenseStatus") in {"approved", "restricted", "unknown"}, f"{sid}: invalid licenseStatus")
        if source["licenseStatus"] == "approved":
            require(bool(source.get("licenseEvidence")), f"{sid}: approved source lacks license evidence")
        by_id[sid] = source
    return by_id


def validate_row(row, sources, seen):
    require(isinstance(row, dict), "row must be an object")
    missing = REQUIRED - row.keys()
    extra = row.keys() - REQUIRED
    require(not missing, f"{row.get('sampleId', '?')}: missing fields {sorted(missing)}")
    require(not extra, f"{row.get('sampleId', '?')}: unknown fields {sorted(extra)}")
    sid = row["sampleId"]
    require(isinstance(sid, str) and sid.startswith("m8-") and sid not in seen, f"duplicate/invalid sampleId: {sid}")
    seen.add(sid)
    require(row["schemaVersion"] == "m8-price-raw-v1", f"{sid}: schema version mismatch")
    require(row["sourceId"] in sources, f"{sid}: unknown sourceId")
    source = sources[row["sourceId"]]
    require(row["sourceType"] == source["sourceType"], f"{sid}: sourceType does not match register")
    require(row["licenseStatus"] == source["licenseStatus"], f"{sid}: license status does not match register")
    require(row["licenseStatus"] == "approved", f"{sid}: unapproved source is excluded from evaluation")
    require(row["category"] in CATEGORY, f"{sid}: invalid category")
    require(row["condition"] in CONDITION, f"{sid}: invalid condition")
    require(row["labelLevel"] in {"L0_SYNTHETIC", "L1_LISTING", "L2_ACCEPTED_OFFER", "L3_COMPLETED_TRANSACTION"}, f"{sid}: invalid label level")
    for field in ("originalPriceFen", "listingPriceFen", "acceptedOfferPriceFen", "transactionPriceFen"):
        validate_price(row[field], f"{sid}.{field}")
    age = row["purchaseAgeMonths"]
    require(age is None or (isinstance(age, int) and not isinstance(age, bool) and 0 <= age <= 600), f"{sid}: invalid purchaseAgeMonths")
    require(row["accessoryState"] in {"complete", "partial", "unknown"}, f"{sid}: invalid accessoryState")
    require(isinstance(row["defectTags"], list) and len(row["defectTags"]) == len(set(row["defectTags"])), f"{sid}: defectTags must be unique")
    listed_at = validate_timestamp(row["listedAt"], f"{sid}.listedAt")
    completed_at = validate_timestamp(row["completedAt"], f"{sid}.completedAt", nullable=True)
    extracted_at = validate_timestamp(row["extractedAt"], f"{sid}.extractedAt")
    require(listed_at <= extracted_at, f"{sid}: listedAt is after extraction")
    if completed_at is not None:
        require(listed_at <= completed_at <= extracted_at, f"{sid}: completedAt is outside listing/extraction window")
    if row["labelLevel"] == "L3_COMPLETED_TRANSACTION":
        require(row["transactionPriceFen"] is not None and row["completedAt"] is not None, f"{sid}: L3 requires transaction price and completion time")
    else:
        require(row["transactionPriceFen"] is None, f"{sid}: non-L3 row cannot carry transaction label")


def round_fen(value: float) -> int:
    yuan = value / 100
    step = 1 if yuan < 100 else (5 if yuan < 1000 else 10)
    return int(round(yuan / step) * step * 100)


def advise(row):
    original = row["originalPriceFen"]
    if original is None:
        return {
            "status": "INSUFFICIENT_DATA", "lowerFen": None, "upperFen": None,
            "recommendedFen": None, "basis": "NO_APPROVED_ANCHOR", "sampleSize": 0,
            "factors": ["ORIGINAL_PRICE_MISSING"], "ruleVersion": RULE_VERSION,
            "degraded": True,
        }
    low, center, high = CONDITION[row["condition"]]
    annual, floor = CATEGORY[row["category"]]
    age = row["purchaseAgeMonths"]
    age_factor = 1.0 if age is None else max(floor, annual ** (age / 12))
    penalty = 1.0
    factors = [f"CONDITION_{row['condition'].upper()}"]
    if age is None:
        factors.append("AGE_UNKNOWN")
    else:
        factors.append(f"AGE_{age}_MONTHS")
    if row["accessoryState"] == "partial" or row["defectTags"]:
        penalty = 0.90
        factors.append("DEFECT_OR_ACCESSORY_PENALTY")
    lower = max(0, round_fen(original * low * age_factor * penalty))
    recommended = round_fen(original * center * age_factor * penalty)
    upper = max(lower, round_fen(original * high * age_factor))
    recommended = min(max(recommended, lower), upper)
    return {
        "status": "LOW_CONFIDENCE", "lowerFen": lower, "upperFen": upper,
        "recommendedFen": recommended, "basis": "ORIGINAL_PRICE_RULE", "sampleSize": 0,
        "factors": factors, "ruleVersion": RULE_VERSION, "degraded": True,
    }


def build(raw_dir=RAW, derived_dir=DERIVED):
    register_path = raw_dir / "source-register.json"
    samples_path = raw_dir / "price-samples.jsonl"
    sources = validate_sources(read_json(register_path))
    rows = read_jsonl(samples_path)
    seen = set()
    for row in rows:
        validate_row(row, sources, seen)
    outputs = []
    for row in sorted(rows, key=lambda item: item["sampleId"]):
        result = advise(row)
        require(result["status"] == row["expectedStatus"], f"{row['sampleId']}: expected status mismatch")
        outputs.append({
            "sampleId": row["sampleId"], "labelLevel": row["labelLevel"],
            "listingPriceFen": row["listingPriceFen"], "transactionPriceFen": row["transactionPriceFen"],
            "advice": result,
        })
    write_jsonl(derived_dir / "price-evaluation.jsonl", outputs)
    valid_ranges = [item for item in outputs if item["advice"]["lowerFen"] is not None]
    l3 = [item for item in outputs if item["labelLevel"] == "L3_COMPLETED_TRANSACTION"]
    metrics = {
        "datasetVersion": DATASET_VERSION,
        "labelLevel": "L0_SYNTHETIC" if not l3 else "MIXED_WITH_L3",
        "recordCount": len(outputs),
        "ruleCoverage": len(valid_ranges) / len(outputs),
        "statusConformance": 1.0,
        "boundsValidRate": mean(1.0 if x["advice"]["lowerFen"] <= x["advice"]["recommendedFen"] <= x["advice"]["upperFen"] else 0.0 for x in valid_ranges),
        "predictionMetrics": "NOT_EVALUATED" if not l3 else "AVAILABLE_IN_L3_EXTENSION",
        "maeFen": None,
        "mape": None,
        "intervalCoverage": None,
        "reason": "No eligible L3 completed-transaction labels; listing prices are never used as truth." if not l3 else None,
    }
    write_json(derived_dir / "metrics.json", metrics)
    manifest = {
        "datasetVersion": DATASET_VERSION,
        "schemaVersion": "m8-price-raw-v1",
        "ruleVersion": RULE_VERSION,
        "recordCount": len(outputs),
        "eligibleL3Count": len(l3),
        "inputs": {
            "source-register.json": sha256(register_path),
            "price-samples.jsonl": sha256(samples_path),
        },
    }
    write_json(derived_dir / "manifest.json", manifest)
    return manifest, metrics


def verify():
    before = {path.name: sha256(path) for path in DERIVED.glob("*") if path.is_file()}
    first = build()
    middle = {path.name: sha256(path) for path in DERIVED.glob("*") if path.is_file()}
    second = build()
    after = {path.name: sha256(path) for path in DERIVED.glob("*") if path.is_file()}
    require(first == second and middle == after, "non-deterministic rebuild")
    require(set(after) == {"manifest.json", "metrics.json", "price-evaluation.jsonl"}, "unexpected derived files")
    print(json.dumps({"status": "PASS", "deterministic": True, "files": after, "previousFiles": before}, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["build", "verify"])
    args = parser.parse_args()
    if args.command == "build":
        manifest, metrics = build()
        print(json.dumps({"status": "PASS", "manifest": manifest, "metrics": metrics}, indent=2))
    else:
        verify()


if __name__ == "__main__":
    try:
        main()
    except DataError as exc:
        print(f"ERROR: {exc}")
        raise SystemExit(2) from exc
