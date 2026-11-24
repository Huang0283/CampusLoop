"""Run opt-in real-model holdouts; never writes products or account data."""

import argparse
import json
import re
from pathlib import Path
from time import perf_counter
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", default="http://127.0.0.1:18790")
    parser.add_argument("--output", type=Path, default=ROOT / ".codex-tmp/translation-quality/results.json")
    args = parser.parse_args()
    cases = json.loads((ROOT / "services/catalog_translation_quality_cases.json").read_text(encoding="utf-8"))
    glossary = json.loads((ROOT / "services/catalog_translation_glossary.json").read_text(encoding="utf-8"))
    evidence = []

    def translate(text, target):
        body = json.dumps({"texts": [text], "target": target}).encode()
        request = Request(args.endpoint.rstrip("/") + "/translate", data=body, headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=180) as response:
            return json.load(response)["translations"][0]

    for case in cases:
        source, target = case["source"], case["target"]
        assert source not in glossary and source not in glossary.values(), case["id"]
        started = perf_counter()
        result = translate(source, target)
        errors = [f"missing meaning: {pattern}" for pattern in case["required"] if not re.search(pattern, result, re.I)]
        errors += [f"wrong meaning: {pattern}" for pattern in case["forbidden"] if re.search(pattern, result, re.I)]
        errors += [f"changed source fact: {token}" for token in case["preserved"] if token not in result]
        # The UI always sends stored source text, never a previous translation.
        source_language = "en" if target == "zh" else "zh"
        if source_language == "en" and re.search(r"[\u3400-\u9fff]", source):
            restored = translate(source, "zh")
            for original in re.findall(r"[\u3400-\u9fff]+", source):
                if original not in restored:
                    errors.append(f"changed original Chinese: {original}")
        else:
            restored = translate(source, source_language)
            if restored != source:
                errors.append("changed original source-language text")
        if translate(source, target) != result:
            errors.append("cache/repeat mismatch")
        evidence.append({**case, "translation": result, "restored": restored, "seconds": round(perf_counter() - started, 3), "errors": errors})
        print(json.dumps({"id": case["id"], "translation": result, "errors": errors}, ensure_ascii=False), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failed = [row["id"] for row in evidence if row["errors"]]
    if failed:
        raise SystemExit(f"FAIL: {failed}; inspect {args.output}")
    print(f"PASS: {len(evidence)} unseen real-model cases; source restoration and repeat checks passed.")


if __name__ == "__main__":
    main()
