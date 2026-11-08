"""Local live-catalog BGE inference; public descriptions only, no account data."""

import argparse
import hmac
import json
import re
import threading
import urllib.request
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from services.m7_semantic.model import Encoder

VERSION = "live-bge-small-zh-v1"


class Ranker:
    def __init__(self, model_dir):
        self.encoder = Encoder(model_dir, {"version": VERSION})
        self.lock = threading.Lock()
        self.cache = OrderedDict()
        self.encoder.encode(["检索服务启动"], query=True)

    def documents(self, texts):
        missing = list(dict.fromkeys(text for text in texts if text not in self.cache))
        for text, vector in zip(missing, self.encoder.encode(missing), strict=True):
            self.cache[text] = vector
        vectors = [self.cache[text] for text in texts]
        for text in texts:
            self.cache.move_to_end(text)
        while len(self.cache) > 5000:
            self.cache.popitem(last=False)
        return vectors

    def score(self, body):
        query, documents = body["query"], body["documents"]
        if not isinstance(query, str) or not 1 <= len(query) <= 200:
            raise ValueError("invalid query")
        if not isinstance(documents, list) or len(documents) > 5000:
            raise ValueError("invalid documents")
        ids, texts = [], []
        for document in documents:
            identity, text = document["id"], document["text"]
            if (
                not isinstance(identity, str)
                or not identity.isdigit()
                or not isinstance(text, str)
                or len(text) > 4000
            ):
                raise ValueError("invalid document")
            ids.append(identity)
            texts.append(text)
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate document")
        with self.lock:
            vectors = self.documents(texts)
            q = self.encoder.encode([query], query=True)[0]
            return {
                "version": VERSION,
                "scores": {
                    key: sum(a * b for a, b in zip(q, v, strict=True))
                    for key, v in zip(ids, vectors, strict=True)
                },
            }

    def warm(self, api):
        texts = []
        for page in range(1, 52):
            with urllib.request.urlopen(
                f"{api}/products?page={page}&pageSize=100", timeout=10
            ) as response:
                data = json.load(response)["data"]
            texts.extend(document_text(p) for p in data["items"])
            if page * 100 >= data["pagination"]["total"]:
                break
        with self.lock:
            self.documents(texts)


def document_text(product):
    # Prioritize titles within the encoder token limit, exclude seller identities.
    return product["title"] + "。" + product.get("description", "")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--token-file", type=Path, required=True)
    parser.add_argument("--port", type=int, default=18789)
    parser.add_argument("--warm-api", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    match = re.search(
        r"^BASELINE_RPC_TOKEN=(.+)$",
        args.token_file.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    token = match.group(1).strip().strip("\"'") if match else ""
    if len(token) < 32:
        raise RuntimeError("Missing local RPC token")
    ranker = Ranker(args.model_dir)
    ranker.warm(args.warm_api.rstrip("/"))

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Never log public query contents or authorization headers.

        def send_json(self, status, body):
            raw = json.dumps(body, allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            try:
                self.wfile.write(raw)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            self.send_json(
                200 if self.path == "/health" else 404,
                {"version": VERSION, "ready": True} if self.path == "/health" else {},
            )

        def do_POST(self):
            if self.path != "/score":
                return self.send_json(404, {})
            if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                return self.send_json(403, {})
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 16 * 1024 * 1024:
                    return self.send_json(413, {})
                self.connection.settimeout(10)
                body = json.loads(self.rfile.read(size))
                result = ranker.score(body)
            except (ValueError, TypeError, KeyError):
                return self.send_json(422, {})
            except Exception:
                return self.send_json(503, {})
            self.send_json(200, result)

    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
