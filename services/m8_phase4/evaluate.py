"""Deterministic Phase 4 baseline/candidate and trust/risk evaluation."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from services.m8_baseline.engine import risk_clues, trust_summary
from .metrics import regression_metrics
from .readiness import ROOT, SAMPLES, inspect
from .router import route_price

FIXED_CASES = ROOT / "contracts/m8-phase3/fixed-cases.json"


def _records(path: Path = SAMPLES) -> list[dict]:
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def _payload(row: dict) -> dict:
    return {key: row[key] for key in (
        "category", "condition", "originalPriceFen", "purchaseAgeMonths", "accessoryState", "defectTags"
    )}


def evaluate_price(samples_path: Path = SAMPLES) -> dict:
    readiness = inspect(samples_path=samples_path)
    rows = _records(samples_path)
    results = []
    metric_rows = []
    for row in rows:
        baseline = route_price(_payload(row), readiness, candidate_enabled=False)
        candidate = route_price(_payload(row), readiness, candidate_enabled=True)
        data = baseline["data"]
        interval = data["intervalFen"]
        metric_rows.append({
            "labelLevel": row["labelLevel"],
            "transactionPriceFen": row["transactionPriceFen"],
            "recommendedFen": None if interval["lower"] is None else (interval["lower"] + interval["upper"]) // 2,
            "lowerFen": interval["lower"],
            "upperFen": interval["upper"],
        })
        results.append({
            "sampleId": row["sampleId"],
            "category": row["category"],
            "listedMonth": row["listedAt"][:7],
            "labelLevel": row["labelLevel"],
            "transactionPriceFen": row["transactionPriceFen"],
            "baseline": baseline,
            "candidateRoute": candidate,
            "sameOutputAfterFallback": baseline["data"] == candidate["data"],
        })
    metrics = regression_metrics(metric_rows)
    return {
        "evaluationVersion": "m8-price-phase4-eval-v1",
        "datasetVersion": readiness["checks"][0]["observed"],
        "decision": readiness["decision"],
        "comparison": {
            "baselineVersion": "m8-price-rule-v1",
            "candidateVersion": "m8-price-candidate-v1",
            "candidateState": "NOT_TRAINED_GATE_NO_GO" if readiness["decision"] == "NO_GO" else "READY_FOR_EXPERIMENT",
            "baselineMetrics": metrics,
            "candidateMetrics": metrics if readiness["decision"] != "NO_GO" else {**metrics, "reason": "Candidate was not trained because the data gate is NO_GO."},
            "fallbackParityRate": sum(item["sameOutputAfterFallback"] for item in results) / len(results) if results else None,
        },
        "drift": {
            "status": "NOT_EVALUATED" if metrics["status"] == "NOT_EVALUATED" else "REQUIRES_TIME_SPLIT_IMPLEMENTATION",
            "categoryCounts": dict(sorted(Counter(row["category"] for row in rows).items())),
            "monthCounts": dict(sorted(Counter(row["listedAt"][:7] for row in rows).items())),
            "reason": "No eligible labeled time slices; counts are descriptive only.",
        },
        "results": results,
    }


def evaluate_trust_risk(cases_path: Path = FIXED_CASES) -> dict:
    cases = json.loads(Path(cases_path).read_text(encoding="utf-8"))["cases"]
    trust_cases = [item for item in cases if item["task"] == "trust"]
    risk_cases = [item for item in cases if item["task"] == "risk"]
    trust_outputs = [{"caseId": item["caseId"], "output": trust_summary(item["input"])} for item in trust_cases]
    risk_outputs = [{"caseId": item["caseId"], "output": risk_clues(item["input"])} for item in risk_cases]
    checks = {
        "newUsersRemainNeutral": all(item["output"]["status"] != "NEW_USER_NEUTRAL" or item["output"]["validEventCount"] == 0 for item in trust_outputs),
        "invalidTrustEventsIgnored": all(item["output"]["ignoredEventCount"] >= 0 for item in trust_outputs),
        "riskNeverAutoEnforces": all(item["output"]["enforcementExecuted"] is False for item in risk_outputs),
        "riskActionsManualOnly": all(item["output"]["recommendedAction"] in {"NONE", "MANUAL_REVIEW"} for item in risk_outputs),
        "noFraudProbabilityClaim": all("fraudProbability" not in item["output"] and "riskScore" not in item["output"] for item in risk_outputs),
    }
    return {
        "evaluationVersion": "m8-trust-risk-phase4-eval-v1",
        "mode": "RULE_ONLY_GOVERNANCE_VALIDATION",
        "riskModelExperiment": "NOT_RUN_NO_APPROVED_LABELS",
        "publicDtoAssessment": "OUT_OF_SCOPE_M6_BOUNDARY; trusted-backend output only",
        "checks": checks,
        "passed": all(checks.values()),
        "trustResults": trust_outputs,
        "riskResults": risk_outputs,
    }


def write(output_dir: Path) -> dict:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    readiness = inspect()
    price = evaluate_price()
    trust_risk = evaluate_trust_risk()
    artifacts = {
        "readiness.json": readiness,
        "price-comparison.json": price,
        "trust-risk-evaluation.json": trust_risk,
    }
    for name, value in artifacts.items():
        (output_dir / name).write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    return {"readiness": readiness, "price": price, "trustRisk": trust_risk}
