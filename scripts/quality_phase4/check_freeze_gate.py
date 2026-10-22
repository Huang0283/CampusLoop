"""Read-only freeze gate; pending approvals and upstream failures block release."""
import json
from pathlib import Path


def main():
    root = Path(__file__).resolve().parents[2]
    directory = root / "docs/evidence/phase-4/management-quality"
    candidate = json.loads((directory / "freeze-candidate.json").read_text(encoding="utf-8"))
    failures = [name for name, passed in candidate["gates"].items() if passed is not True]
    failures.extend(candidate.get("openP1", []))
    if not candidate.get("phase4FreezeCommit") or not candidate.get("phase4Tag"):
        failures.append("unique-freeze-commit-and-tag-pending")
    if candidate.get("approval", {}).get("signedApproval") is not True:
        failures.append("human-approval-pending")
    path = directory / "rpc-fault-observations.json"
    if not path.is_file():
        failures.append("M10-evidence-PR-not-merged-or-missing")
    elif json.loads(path.read_text(encoding="utf-8"))["failCount"]:
        failures.append("actual-rpc-fault-evidence-has-failures")
    decision = "BLOCKED" if failures else "CANDIDATE_READY_FOR_HUMAN_REVIEW"
    signed_approval = candidate.get("approval", {}).get("signedApproval") is True
    print(json.dumps({"decision": decision, "blockers": failures, "signedApproval": signed_approval}, ensure_ascii=False, indent=2))
    return 2 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
