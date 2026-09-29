from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/evidence/phase-2/management-quality"

REQUIRED_FILES = [
    "phase1-decisions.md",
    "requirements-baseline.md",
    "baseline-traceability.md",
    "joint-design-review.md",
    "change-control.md",
    "phase3-test-plan.md",
    "security-state-test-matrix.md",
    "ci-quality-gates.md",
    "second-presentation-package.md",
    "verification.md",
    "deliverables.md",
    "handoff.md",
]

REQUIREMENTS = [
    *(f"AUTH-{index:03d}" for index in range(1, 4)),
    *(f"MARKET-{index:03d}" for index in range(1, 7)),
    *(f"TRADE-{index:03d}" for index in range(1, 11)),
    *(f"AI-{index:03d}" for index in range(1, 5)),
    *(f"ADMIN-{index:03d}" for index in range(1, 4)),
    *(f"QUALITY-{index:03d}" for index in range(1, 7)),
]


def fail(message: str) -> None:
    print(f"FAIL {message}")
    raise SystemExit(1)


for name in REQUIRED_FILES:
    path = EVIDENCE / name
    if not path.is_file() or not path.read_text(encoding="utf-8").strip():
        fail(f"missing or empty {path.relative_to(ROOT)}")

traceability = (EVIDENCE / "baseline-traceability.md").read_text(encoding="utf-8")
missing_requirements = [item for item in REQUIREMENTS if item not in traceability]
if missing_requirements:
    fail("missing requirement IDs: " + ", ".join(missing_requirements))

all_text = "\n".join(
    (EVIDENCE / name).read_text(encoding="utf-8") for name in REQUIRED_FILES
)
for required_term in (
    "401",
    "403",
    "409",
    "422",
    "Idempotency",
    "Phase 3",
    "M1",
    "M10",
    "Owner",
):
    if required_term not in all_text:
        fail(f"missing quality term {required_term}")

for forbidden in (r"\bTBD\b", r"\bTODO\b", "开发时再确定"):
    if re.search(forbidden, all_text, re.IGNORECASE):
        fail(f"forbidden unresolved placeholder: {forbidden}")

links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", all_text)
for target in links:
    if target.startswith(("http://", "https://", "#")):
        continue
    clean_target = target.split("#", 1)[0]
    if not clean_target:
        continue
    if not (EVIDENCE / clean_target).resolve().exists():
        fail(f"broken relative link: {target}")

print(
    f"PASS files={len(REQUIRED_FILES)} requirements={len(REQUIREMENTS)} "
    f"links={len(links)} status=candidate-not-frozen"
)
