from __future__ import annotations

import argparse
import logging
import os

from .http_service import create_server


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    server = create_server(("127.0.0.1", args.port), os.environ.get("M8_SERVICE_TOKEN", ""))
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
