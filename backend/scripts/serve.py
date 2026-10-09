"""One API process plus private loopback advisory services; no public RPC ports."""

import logging
import sys
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import uvicorn

from app.core.config import get_settings
from app.core.security import signing_key


def main():
    settings = get_settings()
    signing_key()  # Refuse to start a login-capable service without its secret.
    servers = []
    threads = []
    stop = threading.Event()
    with tempfile.TemporaryDirectory(prefix="campusloop-advisory-") as folder:
        if settings.baseline_services_enabled:
            from services.m7_baseline.http_service import create_server as m7_server
            from services.m7_baseline.store import BaselineStore
            from services.m8_baseline.http_service import create_server as m8_server

            try:
                addresses = [
                    urlsplit(url) for url in (settings.m7_service_url, settings.m8_service_url)
                ]
                if any(
                    address.scheme != "http"
                    or address.hostname != "127.0.0.1"
                    or address.path not in ("", "/")
                    or address.username
                    or address.query
                    or address.fragment
                    for address in addresses
                ):
                    raise ValueError("Private advisory addresses must be loopback roots.")
                servers.append(
                    m7_server(
                        ("127.0.0.1", addresses[0].port or 80),
                        BaselineStore(Path(folder) / "snapshots.sqlite"),
                        settings.baseline_rpc_token,
                    )
                )
                servers.append(
                    m8_server(("127.0.0.1", addresses[1].port or 80), settings.baseline_rpc_token)
                )
                for server in servers:
                    thread = threading.Thread(target=server.serve_forever, daemon=True)
                    thread.start()
                    threads.append(thread)
            except (OSError, ValueError):
                for server in servers:
                    server.server_close()
                servers = []
                logging.getLogger("runtime").warning(
                    "Advisory startup failed; API will expose explicit degradation."
                )
        try:
            from app.services.matching_jobs import worker_loop

            worker = threading.Thread(target=worker_loop, args=(stop,), daemon=True)
            worker.start()
            threads.append(worker)
            uvicorn.run(
                "app.main:app", host="0.0.0.0", port=8000, access_log=False, log_config=None
            )
        finally:
            stop.set()
            for server in servers:
                server.shutdown()
                server.server_close()
            for thread in threads:
                thread.join(timeout=3)


if __name__ == "__main__":
    main()
