"""Private CLI for build/update/query. It does not enable any public service."""
import argparse
import json
from pathlib import Path
from services.m7_baseline.engine import ROOT
from .hybrid import rank
from .index import VectorIndex
from .model import CandidateUnavailable, Encoder, document_text


def rows(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["build", "update", "query"])
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--products", type=Path, required=True)
    parser.add_argument("--dictionary", type=Path, default=ROOT / "data/m7-phase2/raw/dictionary.json")
    parser.add_argument("--request", type=Path)
    parser.add_argument("--sort", default="relevance", choices=["relevance", "newest", "price_asc", "price_desc"])
    args = parser.parse_args()
    dictionary = json.loads(args.dictionary.read_text(encoding="utf-8"))
    products = sorted(rows(args.products), key=lambda p: int(p["productId"]))
    encoder = Encoder(args.model_dir, dictionary)
    if args.action == "query" and args.request is None:
        parser.error("query requires --request")
    request = json.loads(args.request.read_text(encoding="utf-8")) if args.action == "query" else None
    try:
        index = VectorIndex(args.index, identity=encoder.identity)
    except CandidateUnavailable as exc:
        if args.action != "query":
            raise
        result = rank(products, request, dictionary, sort=args.sort)
        result["metadata"].update(degraded=True, fallbackReason=str(exc))
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, allow_nan=False))
        return
    try:
        if args.action in {"build", "update"}:
            vectors = encoder.encode([document_text(p, dictionary) for p in products])
            if args.action == "build":
                index.rebuild(products, vectors)
                result = {"status": "READY", "identity": encoder.identity, "logicalDigest": index.logical_digest()}
            else:
                result = {"updates": index.upsert(products, vectors), "logicalDigest": index.logical_digest()}
        else:
            result = rank(products, request, dictionary, encoder=encoder, index=index, experimental=True, sort=args.sort)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, allow_nan=False))
    finally:
        index.close()


if __name__ == "__main__":
    main()
