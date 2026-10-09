"""Check gate-registration prerequisites. Never authorizes model deployment."""
import argparse
import json
import math
from pathlib import Path


POLICY = Path(__file__).resolve().parents[2] / "contracts/intelligence-phase2/model-gates.candidate.json"
REQUIRED = {
    "semantic-search": ({"M7", "M10", "M1"}, {"mrrAt10Min", "recallAt10Min", "precisionAt5Min",
        "relativeMrrImprovementMin", "sliceRecallDropMax", "minimumSliceCount", "p95MsMax",
        "p99MsMax", "rssMiBMax", "diskMiBMax"}),
    "supply-demand-matching": ({"M7", "M10", "M1"}, {"mrrAt10Min", "recallAt10Min",
        "hardViolationCountMax", "relativeMrrImprovementMin", "sliceRecallDropMax",
        "minimumSliceCount", "p95MsMax", "p99MsMax", "rssMiBMax", "diskMiBMax"}),
    "price-model": ({"M8", "M10", "M1"}, {"nmaeMax", "mapeMax", "intervalCoverageMin",
        "normalizedWidthMax", "relativeNmaeImprovementMin", "sliceNmaeIncreaseMax",
        "minimumSliceCount", "p95MsMax", "p99MsMax", "rssMiBMax", "modelMiBMax"}),
}


def check(policy):
    if not isinstance(policy, dict) or not isinstance(policy.get("capabilities"), list):
        raise ValueError("invalid gate registration")
    by_id = {row["capability"]: row for row in policy["capabilities"]}
    if set(by_id) != set(REQUIRED) or len(by_id) != len(policy["capabilities"]):
        raise ValueError("missing/duplicate capability")
    reports = []
    for name, (roles, numeric_fields) in REQUIRED.items():
        row = by_id[name]
        reasons = []
        thresholds = row.get("thresholds", {})
        if not isinstance(thresholds, dict) or set(thresholds) != numeric_fields or any(
                type(v) not in (int, float) or not math.isfinite(v) or v < 0
                for v in thresholds.values()):
            reasons.append("NUMERIC_THRESHOLDS_MISSING_OR_INVALID")
        if not row.get("datasetVersion") or row.get("datasetFrozen") is not True:
            reasons.append("DATASET_NOT_FROZEN")
        count, minimum = row.get("reviewedExampleCount"), row.get("minimumExampleCount")
        if type(count) is not int or type(minimum) is not int or minimum <= 0 or count < minimum:
            reasons.append("REVIEWED_LABEL_COUNT_INSUFFICIENT")
        environment = row.get("environment")
        if not isinstance(environment, dict) or not all(environment.get(k) for k in
                ("hardwareId", "concurrency", "warmupProcedure", "measurementBoundary", "approvalEvidence")):
            reasons.append("PERFORMANCE_ENVIRONMENT_NOT_CONFIRMED")
        if not row.get("fallbackScenarios"):
            reasons.append("FALLBACK_SCENARIOS_MISSING")
        approvals = row.get("approvals", {})
        for role in sorted(roles):
            approval = approvals.get(role) if isinstance(approvals, dict) else None
            if not isinstance(approval, dict) or not all(approval.get(k) for k in
                    ("approvedAt", "evidenceUrl", "policySha256")):
                reasons.append(f"APPROVAL_MISSING_{role}")
        reports.append({"capability": name, "registration": "NO_GO" if reasons else "READY_FOR_EVALUATION",
                        "reasons": reasons, "modelDecision": "NO_GO_PENDING_EFFECT_AND_FALLBACK_EVIDENCE"})
    return {"policyVersion": policy.get("policyVersion"), "deploymentAuthorized": False,
            "capabilities": reports}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", type=Path, default=POLICY)
    args = parser.parse_args()
    try:
        report = check(json.loads(args.policy.read_text(encoding="utf-8")))
        print(json.dumps(report, indent=2, sort_keys=True))
        return 3 if any(r["registration"] == "NO_GO" for r in report["capabilities"]) else 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
