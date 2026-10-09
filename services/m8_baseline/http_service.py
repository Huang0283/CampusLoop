"""Loopback-only versioned RPC for trusted backend callers."""
from __future__ import annotations

from http.server import BaseHTTPRequestHandler, HTTPServer
import hmac
import json
import logging
import time

from . import SERVICE_VERSION
from .engine import ServiceError, evaluate

LOGGER = logging.getLogger("m8_baseline")
ROUTES = {"/v1/price-advice": "price", "/v1/trust-summary": "trust", "/v1/risk-clues": "risk"}


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def create_server(address, token: str):
    if address[0] != "127.0.0.1" or not isinstance(token, str) or len(token) < 32:
        raise ValueError("loopback address and >=32-character token required")

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(3)

        def reply(self, status, value):
            encoded = json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(encoded)

        def do_POST(self):
            started, status, code = time.monotonic(), 200, "OK"
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 1024 * 1024 or self.headers.get("Transfer-Encoding"):
                    raise ServiceError(413, "PAYLOAD_TOO_LARGE")
                raw = self.rfile.read(length)
                if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                    raise ServiceError(401, "UNAUTHORIZED")
                if self.path not in ROUTES:
                    raise ServiceError(404, "NOT_FOUND")
                if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
                    raise ServiceError(415, "UNSUPPORTED_MEDIA_TYPE")
                envelope = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique,
                                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
                if not isinstance(envelope, dict) or set(envelope) != {"schemaVersion", "payload"} or envelope["schemaVersion"] != SERVICE_VERSION:
                    raise ServiceError(422, "VALIDATION_ERROR")
                self.reply(200, {"schemaVersion": SERVICE_VERSION, "data": evaluate(ROUTES[self.path], envelope["payload"])})
            except ServiceError as exc:
                status, code = exc.status, exc.code
                self.reply(status, {"schemaVersion": SERVICE_VERSION, "error": {"code": code}})
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError, TypeError, KeyError):
                status, code = 422, "VALIDATION_ERROR"
                self.reply(status, {"schemaVersion": SERVICE_VERSION, "error": {"code": code}})
            except (TimeoutError, OSError):
                status, code = 503, "DEPENDENCY_UNAVAILABLE"
                try:
                    self.reply(status, {"schemaVersion": SERVICE_VERSION, "error": {"code": code}})
                except OSError:
                    pass
            finally:
                # Payloads, credentials and device/user identifiers are never logged.
                LOGGER.info("operation=%s status=%s code=%s durationMs=%d", ROUTES.get(self.path, "unknown"), status, code, (time.monotonic() - started) * 1000)

        def log_message(self, *args):
            pass

    return HTTPServer(address, Handler)
