"""Author technical reproduction; never signs stage acceptance."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
from scripts.intelligence_phase2.run_all import asset_hashes, clean_log, git_value
from .engine import ROOT


def hashes(review_archive=None):
    values = asset_hashes()
    for directory in ("services", "schemas/m7-phase3"):
        for path in sorted((ROOT / directory).rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                values[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    if review_archive is not None:
        for name in ("manifest.json", "review-records.csv", "labels.reviewed.jsonl", "review-check.json"):
            values["<review-archive>/" + name] = hashlib.sha256((review_archive / name).read_bytes()).hexdigest()
    return values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--review-archive", type=Path)
    args = parser.parse_args()
    directory = args.output_dir.resolve()
    if directory.exists() and any(directory.iterdir()):
        parser.error("output directory must be empty")
    directory.mkdir(parents=True, exist_ok=True)
    before = hashes(args.review_archive)
    record = dict(status="PASS", startedAt=datetime.now(timezone.utc).isoformat(),
                  codeCommit=git_value(["rev-parse", "HEAD"]), workingTreeDirty=bool(git_value(["status", "--porcelain"])),
                  environment=dict(os=platform.system(), python=platform.python_version(), machine=platform.machine()),
                  command=["python", "-m", "services.m7_baseline.verify", "--output-dir", "<empty-directory>"],
                  sourceHashes=before, results=[], acceptance="AUTHOR_TECHNICAL_CHECK_ONLY; M6/M8/M9/M10/M1 acceptance pending")
    environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1")
    if args.review_archive is not None:
        record["command"].extend(["--review-archive", "<review-archive>"])
    steps = [("phase2-regression", ["scripts/intelligence_phase2/run_all.py", "--output-dir", str(directory / "phase2")]),
             ("phase3-tests", ["-m", "unittest", "discover", "-s", "services/m7_baseline/tests", "-v"]),
             ("fixed-evaluation", ["-m", "services.m7_baseline.evaluate", "--output-dir", str(directory / "evaluation")]),
             ("repeat-evaluation", ["-m", "services.m7_baseline.evaluate", "--output-dir", str(directory / "evaluation-repeat")])]
    if args.review_archive is not None:
        for name, arguments in steps:
            if name in {"fixed-evaluation", "repeat-evaluation"}:
                arguments.extend(["--review-archive", str(args.review_archive.resolve())])
    for split in ("all", "dev", "test_candidate"):
        steps.append(("recalculate-" + split, ["scripts/intelligence_phase2/metrics.py", "--input", str(directory / "evaluation" / f"evaluation-input-{split}.json"), "--output", str(directory / f"recalculated-{split}.json")]))
    for name, arguments in steps:
        started = datetime.now(timezone.utc).isoformat()
        try:
            result = subprocess.run([sys.executable, *arguments], cwd=ROOT, env=environment,
                                    encoding="utf-8", capture_output=True, timeout=60)
            row = dict(name=name, command=["python", *[clean_log(a).replace(str(directory), "<evidence>") for a in arguments]],
                       exitCode=result.returncode, stdout=clean_log(result.stdout).replace(str(directory), "<evidence>"),
                       stderr=clean_log(result.stderr).replace(str(directory), "<evidence>"))
        except (subprocess.TimeoutExpired, OSError) as exc:
            row = dict(name=name, command=["python", *arguments], exitCode=2, stdout="", stderr=clean_log(str(exc)))
        row.update(startedAt=started, endedAt=datetime.now(timezone.utc).isoformat())
        record["results"].append(row)
        for stream in ("stdout", "stderr"):
            (directory / f"{name}.{stream}.txt").write_text(row[stream], encoding="utf-8", newline="\n")
        if row["exitCode"]:
            record["status"] = "FAIL"
            break
    if record["status"] == "PASS":
        paths = sorted((directory / "evaluation").glob("*.json"))
        record["deterministicEvaluation"] = all(p.read_bytes() == (directory / "evaluation-repeat" / p.name).read_bytes() for p in paths)
        record["metricsRecalculated"] = all(json.loads((directory / f"recalculated-{s}.json").read_text(encoding="utf-8")) == json.loads((directory / "evaluation" / f"metrics-{s}.json").read_text(encoding="utf-8")) for s in ("all", "dev", "test_candidate"))
        if not record["deterministicEvaluation"] or not record["metricsRecalculated"]:
            record["status"] = "FAIL"
    record["assetsUnchanged"] = before == hashes(args.review_archive)
    if not record["assetsUnchanged"]:
        record["status"] = "FAIL"
    record["endedAt"] = datetime.now(timezone.utc).isoformat()
    (directory / "run-record.json").write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: record.get(k) for k in ("status", "codeCommit", "workingTreeDirty", "assetsUnchanged", "deterministicEvaluation", "metricsRecalculated")}))
    return 0 if record["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
