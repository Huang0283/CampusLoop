"""Read-only freeze gate; pending approvals and upstream failures block release."""
import json
from pathlib import Path


def main():
    root = Path(__file__).resolve().parents[2]
    directory = root / "docs/evidence/phase-4/management-quality"
    candidate = json.loads((directory / "freeze-candidate.json").read_text(encoding="utf-8"))
    failures = [name for name, passed in candidate["gates"].items() if passed is not True]
    failures.extend(candidate["openP1"])
    if not candidate["phase4FreezeCommit"] or not candidate["phase4Tag"]:
        failures.append("unique-freeze-commit-and-tag-pending")
    path = directory / "rpc-fault-observations.json"
    if not path.is_file():
        failures.append("M10-evidence-PR-not-merged-or-missing")
    elif json.loads(path.read_text(encoding="utf-8"))["failCount"]:
        failures.append("actual-rpc-fault-evidence-has-failures")
    print(json.dumps({"decision": "BLOCKED" if failures else "CANDIDATE_READY_FOR_HUMAN_REVIEW", "blockers": failures, "signedApproval": False}, ensure_ascii=False, indent=2))
    return 2 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
