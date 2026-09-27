from __future__ import annotations

import math
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs" / "evidence" / "phase-1" / "intelligence"

REQUIRED_FILES = {
    "search-requirements.md",
    "keyword-baseline-design.md",
    "matching-baseline-design.md",
    "matching-lifecycle.md",
    "search-evaluation-plan.md",
    "capability-decision-matrix.md",
    "deliverables.md",
    "verification.md",
    "handoff.md",
}


def read(name: str) -> str:
    return (EVIDENCE / name).read_text(encoding="utf-8")


def main() -> int:
    failures: list[str] = []
    passed = 0

    def check(condition: bool, label: str) -> None:
        nonlocal passed
        if condition:
            passed += 1
            print(f"PASS {label}")
        else:
            failures.append(label)
            print(f"FAIL {label}")

    for name in sorted(REQUIRED_FILES):
        check((EVIDENCE / name).is_file(), f"required file: {name}")

    markdown_files = sorted(EVIDENCE.glob("*.md"))
    for source in markdown_files:
        text = source.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            if target.startswith(("http://", "https://", "#")):
                continue
            relative_path = target.split("#", 1)[0]
            if not (relative_path.endswith((".md", ".py")) or "/" in relative_path or "\\" in relative_path):
                continue
            if relative_path:
                check((source.parent / relative_path).resolve().exists(), f"link: {source.name} -> {target}")

    scenario_sources = {
        "SR": (read("search-requirements.md"), 12),
        "MC": (read("matching-baseline-design.md"), 10),
        "LC": (read("matching-lifecycle.md"), 10),
    }
    for prefix, (text, count) in scenario_sources.items():
        actual = sorted(set(re.findall(rf"{prefix}-(\d{{2}})", text)))
        expected = [f"{index:02d}" for index in range(1, count + 1)]
        check(actual == expected, f"{prefix} scenarios 01-{count:02d}")

    keyword = read("keyword-baseline-design.md")
    matching = read("matching-baseline-design.md")
    lifecycle = read("matching-lifecycle.md")
    evaluation = read("search-evaluation-plan.md")
    matrix = read("capability-decision-matrix.md")

    check("NFKC" in keyword and "score_keyword" in keyword, "deterministic keyword baseline")
    check("????" in keyword and "Phase 4 ???????" in keyword, "keyword baseline does not require vectors")
    check("??????" in matching and "ineligible" in matching, "hard constraints precede scoring")
    check("rankScore" in matching and "contribution_i" in matching, "matching score is explainable")
    check("eventId" in lifecycle and "superseded" in lifecycle, "event idempotency and stale-version handling")
    check("eligibilityEpoch" in lifecycle and "notification_outbox" in lifecycle, "notification deduplication")
    check("degraded=true" in lifecycle and "unavailable" in lifecycle, "degradation contract")
    check(all(metric in evaluation for metric in ("P@K", "R@K", "MRR@K", "???")), "evaluation metrics and leakage control")
    check("M7 ??????" in matrix, "M7 capability decision supplement")

    check(math.isclose(100 * (4 / 9), 44.4444444444, rel_tol=1e-9), "matching score without preference")
    check(math.isclose(100 * (0.75 * (4 / 9) + 0.25), 58.3333333333, rel_tol=1e-9), "matching score with preference")
    check(math.isclose((0.4 + 0.2) / 2, 0.3), "macro P@5 example")
    check(math.isclose((0.5 + 0.5) / 2, 0.5), "macro R@5 example")
    check(math.isclose((1 + 0.5) / 2, 0.75), "MRR@5 example")

    stale_phrases = (
        "??????? PR",
        "???????",
        "???? PR ????",
        "??????",
        "delivery_commit=null",
    )
    combined = "\n".join(path.read_text(encoding="utf-8") for path in markdown_files)
    for phrase in stale_phrases:
        check(phrase not in combined, f"no stale status: {phrase}")

    print(f"SUMMARY passed={passed} failed={len(failures)}")
    if failures:
        for failure in failures:
            print(f" - {failure}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
