"""One-command M8 Phase 3 verification and reproducibility check."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import sys
import tempfile

from .evaluate import write

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        raise SystemExit("output directory must be empty")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    tests = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "services/m8_baseline/tests", "-v"],
                           cwd=ROOT, text=True, capture_output=True, check=False)
    (args.output_dir / "tests.stdout.txt").write_text(tests.stdout, encoding="utf-8", newline="\n")
    (args.output_dir / "tests.stderr.txt").write_text(tests.stderr, encoding="utf-8", newline="\n")
    with tempfile.TemporaryDirectory() as temp:
        first, second = Path(temp) / "first.json", Path(temp) / "second.json"
        write(first); write(second)
        deterministic = first.read_bytes() == second.read_bytes()
        (args.output_dir / "baseline-results.json").write_bytes(first.read_bytes())
    sources = [
        ROOT / "services/m8_baseline/engine.py", ROOT / "services/m8_baseline/client.py",
        ROOT / "services/m8_baseline/http_service.py", ROOT / "services/m8_baseline/evaluate.py",
        ROOT / "services/m8_baseline/verify.py",
        ROOT / "contracts/m8-phase3/fixed-cases.json", ROOT / "contracts/m8-phase3/service-contract.json",
    ]
    record = {
        "verificationVersion": "m8-p3-verification-v1",
        "python": platform.python_version(), "platform": platform.platform(),
        "testsReturnCode": tests.returncode, "deterministic": deterministic,
        "sourceHashes": {str(path.relative_to(ROOT)).replace("\\", "/"): digest(path) for path in sources},
        "resultHash": digest(args.output_dir / "baseline-results.json"),
    }
    (args.output_dir / "run-record.json").write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    if tests.returncode or not deterministic:
        raise SystemExit(1)
    print(json.dumps({"status": "PASS", **record}, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
