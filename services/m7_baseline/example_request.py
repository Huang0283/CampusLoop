"""Synthetic network smoke input with current time; never edits frozen assets."""
from datetime import datetime, timezone
import json
from .engine import ROOT


def main():
    requests = [json.loads(line) for line in (ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()]
    request = next(r for r in requests if r["requestId"] == "calculator-search-exact")
    request["context"]["asOf"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    products = [json.loads(line) for line in (ROOT / "data/m7-phase2/derived/products.jsonl").read_text(encoding="utf-8").splitlines()]
    products = [p for p in products if p["catalogId"] == request["catalogId"]]
    dictionary = json.loads((ROOT / "data/m7-phase2/raw/dictionary.json").read_text(encoding="utf-8"))
    print(json.dumps(dict(schemaVersion="m7-baseline-rpc-v1", products=products, request=request, dictionary=dictionary), ensure_ascii=False))


if __name__ == "__main__":
    main()
