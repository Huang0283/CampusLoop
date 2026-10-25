"""Reproduce technical evidence from a checkout; never signs formal acceptance."""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
from services.m7_baseline.engine import ROOT
from services.m7_baseline.evaluate import lines, read
from .evaluate import git, write
from .index import VectorIndex
from .model import CandidateUnavailable, Encoder, document_text


def real_update_check(model_dir):
    dictionary = read(ROOT / "data/m7-phase2/raw/dictionary.json")
    product = next(p for p in lines(ROOT / "data/m7-phase2/derived/products.jsonl")
                   if p["status"] == "ON_SALE" and not p["deleted"])
    encoder = Encoder(model_dir, dictionary)
    vector = encoder.encode([document_text(product, dictionary)])[0]
    index = VectorIndex(":memory:", identity=encoder.identity)
    try:
        index.rebuild([product], [vector])
        changed = copy.deepcopy(product)
        changed.update(entityVersion=product["entityVersion"] + 1, title=product["title"] + " 附配件")
        new_vector = encoder.encode([document_text(changed, dictionary)])[0]
        outcomes = dict(update=index.upsert([changed], [new_vector]),
                        duplicate=index.upsert([changed], [new_vector]),
                        oldEvent=index.upsert([product], [vector]))
        hits = index.query(encoder.encode(["附配件"], query=True)[0], [changed], identity=encoder.identity)
        outcomes["queriedUpdatedProduct"] = hits[0][0] == changed["productId"]
        outcomes["delete"] = index.delete(changed["productId"], changed["entityVersion"] + 1)
        outcomes["staleAfterDelete"] = index.upsert([changed], [new_vector])
        try:
            index.query(vector, [changed], identity=encoder.identity)
            outcomes["tombstoneRejected"] = False
        except CandidateUnavailable as exc:
            outcomes["tombstoneRejected"] = str(exc) == "INDEX_FACTS_STALE"
        outcomes["maxUnitNormError"] = max(abs(sum(v * v for v in item) ** .5 - 1) for item in [vector, new_vector])
        assert outcomes["update"] == ["APPLIED"] and outcomes["duplicate"] == ["IDEMPOTENT"]
        assert outcomes["oldEvent"] == outcomes["staleAfterDelete"] == ["STALE_IGNORED"]
        assert outcomes["queriedUpdatedProduct"] and outcomes["tombstoneRejected"]
        assert outcomes["maxUnitNormError"] < 1e-6
        return outcomes
    finally:
        index.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    if output.exists() and any(output.iterdir()):
        parser.error("output directory must be empty")
    output.mkdir(parents=True, exist_ok=True)
    record = dict(status="PASS", codeCommit=git("rev-parse", "HEAD"),
                  workingTreeDirty=bool(git("status", "--porcelain")),
                  startedAtUtc=datetime.now(timezone.utc).isoformat(),
                  environment=dict(python=platform.python_version(), os=platform.platform(), machine=platform.machine()),
                  steps=[], acceptance="AUTHOR_TECHNICAL_CHECK_ONLY; no M8/M10/M1 signature",
                  tddException="User explicitly approved unittest alternative on 2026-10-11; installed tdd skill absent")
    environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1",
                       HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1")
    steps = [("phase4-tests", ["-m", "unittest", "discover", "-s", "services/m7_semantic/tests", "-v"]),
             ("phase2-phase3-regression", ["-m", "services.m7_baseline.verify", "--output-dir", str(output / "baseline-regression")]),
             ("m8-regression", ["-m", "unittest", "discover", "-s", "services/m8_baseline/tests", "-v"]),
             ("evaluation", ["-m", "services.m7_semantic.evaluate", "--model-dir", str(args.model_dir.resolve()), "--output-dir", str(output / "evaluation")]),
             ("evaluation-repeat", ["-m", "services.m7_semantic.evaluate", "--model-dir", str(args.model_dir.resolve()), "--output-dir", str(output / "evaluation-repeat")])]
    for split in ("all", "dev", "test_candidate"):
        steps.append(("recalculate-" + split, ["scripts/intelligence_phase2/metrics.py", "--input", str(output / "evaluation" / f"evaluation-input-{split}.json"), "--output", str(output / f"recalculated-{split}.json")]))
    for name, arguments in steps:
        result = subprocess.run([sys.executable, *arguments], cwd=ROOT, env=environment, capture_output=True, encoding="utf-8", timeout=180)
        command = ["python", *[a.replace(str(args.model_dir.resolve()), "<pinned-local-model>").replace(str(output), "<evidence>") for a in arguments]]
        row = dict(name=name, command=command, exitCode=result.returncode)
        record["steps"].append(row)
        for stream in ("stdout", "stderr"):
            (output / f"{name}.{stream}.txt").write_text(getattr(result, stream).replace(str(ROOT), "<checkout>"), encoding="utf-8", newline="\n")
        if result.returncode:
            record["status"] = "FAIL"
            break
    if record["status"] == "PASS":
        deterministic = ["per-query.json", "failure-analysis.json"] + [f"{stem}-{split}.json" for split in ("all", "dev", "test_candidate") for stem in ("metrics", "evaluation-input")]
        record["deterministicOutputHashes"] = {name: hashlib.sha256((output / "evaluation" / name).read_bytes()).hexdigest() for name in deterministic}
        record["deterministicOutputs"] = all((output / "evaluation" / name).read_bytes() == (output / "evaluation-repeat" / name).read_bytes() for name in deterministic)
        record["metricsRecalculated"] = all(read(output / f"recalculated-{split}.json") == read(output / "evaluation" / f"metrics-{split}.json") for split in ("all", "dev", "test_candidate"))
        record["realModelIncrementalCheck"] = real_update_check(args.model_dir)
        if not record["deterministicOutputs"] or not record["metricsRecalculated"]:
            record["status"] = "FAIL"
    record["endedAtUtc"] = datetime.now(timezone.utc).isoformat()
    write(output / "run-record.json", record)
    freeze = subprocess.run([sys.executable, "-m", "pip", "freeze"], capture_output=True, encoding="utf-8", check=True)
    (output / "dependencies.freeze.txt").write_text(freeze.stdout, encoding="utf-8", newline="\n")
    print(json.dumps({k: record.get(k) for k in ("status", "codeCommit", "workingTreeDirty", "deterministicOutputs", "metricsRecalculated")}))
    return 0 if record["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
