import argparse
import json
import logging
import os
from pathlib import Path
from .http_service import create_server
from .store import BaselineStore


def main():
    parser = argparse.ArgumentParser(description="M7 private loopback baseline candidate")
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    token = os.environ.get("M7_SERVICE_TOKEN", "")
    if len(token) < 32 or not 0 <= args.port <= 65535:
        parser.error("set M7_SERVICE_TOKEN (>=32 characters) and a valid port")
    args.database.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    with create_server(("127.0.0.1", args.port), BaselineStore(args.database), token) as server:
        print(json.dumps({"serviceVersion": "m7-baseline-rpc-v1", "host": "127.0.0.1", "port": server.server_port}), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
