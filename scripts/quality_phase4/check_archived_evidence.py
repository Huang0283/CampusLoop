"""Offline integrity and independent strict-metric checks for archived evidence."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

from archive_evaluation import strict_check


def main():
    root = Path(__file__).resolve().parents[2]
    evidence = root / "docs/evidence/phase-4/management-quality/ai-evaluation"
    record = json.loads((evidence / "independent-check.json").read_text(encoding="utf-8"))
    for name, expected in record["archiveHashes"].items():
        path = (evidence / name).resolve()
        if path.parent != evidence.resolve():
            raise ValueError("invalid archive path")
        # Archives are generated with LF. Windows Git may check text out as CRLF;
        # normalize only line endings, without changing JSON or its ordering.
        content = path.read_bytes().replace(b"\r\n", b"\n")
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError("archive hash mismatch: " + name)
    for split in ("all", "dev", "test_candidate"):
        document = json.loads((evidence / f"evaluation-input-{split}.json").read_text(encoding="utf-8"))
        metrics = json.loads((evidence / f"metrics-{split}.json").read_text(encoding="utf-8"))
        strict_check(document, metrics)
    status = json.loads((evidence / "evaluation-status.json").read_text(encoding="utf-8"))
    if status["formalDecision"] != record["formalDecision"] or record["freezeApproved"]:
        raise ValueError("approval inconsistent with archived independent record")
    print("PASS: archived hashes and independent strict metrics; not a live release gate")
    return 0


if __name__ == "__main__":
    sys.exit(main())
