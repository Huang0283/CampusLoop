"""Read-only M8 schema and committed-byte rebuild checks for the joint runner."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[2]


def load_pipeline(root):
    path = root / "scripts/m8_phase2/pipeline.py"
    spec = importlib.util.spec_from_file_location("joint_m8_pipeline", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_price(root=ROOT):
    pipeline = load_pipeline(root)
    raw = root / "data/m8-phase2/raw"
    derived = root / "data/m8-phase2/derived"
    schema = pipeline.read_json(root / "schemas/m8-phase2/price-dataset.schema.json")
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    for row in pipeline.read_jsonl(raw / "price-samples.jsonl"):
        validator.validate(row)
    expected = {"manifest.json", "metrics.json", "price-evaluation.jsonl"}
    pipeline.require({p.name for p in derived.iterdir() if p.is_file()} == expected,
                     "M8 derived file set mismatch")
    before = {name: pipeline.sha256(derived / name) for name in expected}
    with tempfile.TemporaryDirectory() as directory:
        first = Path(directory) / "first"
        second = Path(directory) / "second"
        manifest, metrics = pipeline.build(raw_dir=raw, derived_dir=first)
        pipeline.build(raw_dir=raw, derived_dir=second)
        hashes1 = {name: pipeline.sha256(first / name) for name in expected}
        hashes2 = {name: pipeline.sha256(second / name) for name in expected}
        pipeline.require(before == hashes1 == hashes2,
                         "M8 committed bytes differ from deterministic rebuild; no files were rewritten")
    pipeline.require(before == {name: pipeline.sha256(derived / name) for name in expected},
                     "M8 derived assets changed during verification")
    return {"status": "PASS", "readOnly": True, "files": dict(sorted(before.items())),
            "manifest": manifest, "metrics": metrics}


if __name__ == "__main__":
    try:
        print(json.dumps(verify_price(), sort_keys=True, indent=2))
    except Exception as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}))
        raise SystemExit(2) from exc
