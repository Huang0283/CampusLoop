"""Joint technical receipt; never signs M10/M1 acceptance."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

from services.m7_baseline.engine import ROOT


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    if output.exists() and any(output.iterdir()):
        parser.error("output directory must be empty")
    output.mkdir(parents=True, exist_ok=True)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    record = dict(status="RUNNING", sourceCommit=commit,
        workingTreeDirty=bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()),
        startedAt=datetime.now(timezone.utc).isoformat(),
        environment=dict(os=platform.platform(), python=platform.python_version(), machine=platform.machine()),
        acceptance="AUTHOR_TECHNICAL_CHECK_ONLY; M8_REVIEW_M10_M1_SIGNOFF_PENDING",
        formalStageComplete=False, deploymentEnabled=False, steps=[])
    environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1", HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1")
    steps = [("m7-baseline", ["-m", "services.m7_baseline.verify", "--output-dir", output / "m7-baseline"]),
             ("m8-regression", ["-m", "services.m8_phase4.verify", "--output-dir", output / "m8", "--source-commit", commit]),
             ("joint-deployment", ["-m", "services.intelligence_phase4.smoke", "--output-dir", output / "deployment"])]
    if args.model_dir:
        steps.append(("m7-model-reproduction", ["-m", "services.m7_semantic.verify", "--model-dir", args.model_dir.resolve(), "--output-dir", output / "m7-semantic"]))
    else:
        steps.append(("m7-private-unit-tests", ["-m", "unittest", "discover", "-s", "services/m7_semantic/tests", "-v"]))
    for name, arguments in steps:
        command = [sys.executable, *map(str, arguments)]
        try:
            result = subprocess.run(command, cwd=ROOT, env=environment, capture_output=True, encoding="utf-8", timeout=360)
            code, stdout, stderr = result.returncode, result.stdout, result.stderr
        except (subprocess.TimeoutExpired, OSError) as exc:
            code, stdout, stderr = 124, "", str(exc)
        def safe(text):
            text = text.replace(str(output), "<output>").replace(str(ROOT), "<checkout>")
            return text.replace(str(args.model_dir.resolve()), "<pinned-model>") if args.model_dir else text
        row = dict(name=name, command=["python", *[safe(str(x)) for x in arguments]], exitCode=code)
        for stream, content in (("stdout", stdout), ("stderr", stderr)):
            filename = name + "." + stream + ".txt"
            (output / filename).write_text(safe(content), encoding="utf-8", newline="\n")
            row[stream+"Sha256"] = hashlib.sha256((output / filename).read_bytes()).hexdigest()
        record["steps"].append(row)
        print(json.dumps(dict(step=name, exitCode=code)), flush=True)
        if code:
            break
    success = len(record["steps"]) == len(steps) and all(row["exitCode"] == 0 for row in record["steps"])
    record.update(status="PASS" if success else "FAIL", endedAt=datetime.now(timezone.utc).isoformat(),
                  semanticInferenceReproduced=bool(args.model_dir and success))
    (output / "run-record.json").write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2)+"\n", encoding="utf-8", newline="\n")
    print(json.dumps(dict(status=record["status"], sourceCommit=commit, formalStageComplete=False)))
    return 0 if success else 2


if __name__ == "__main__":
    raise SystemExit(main())
