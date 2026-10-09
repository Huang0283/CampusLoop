"""Loopback-only internal RPC. This is not the M6 public API."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
import hmac
import json
import logging
import time
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from .engine import ServiceError, rank, ROOT, DATA_SCHEMA, FORMATS

LOGGER = logging.getLogger("m7_baseline")
RPC_SCHEMA = json.loads((ROOT / "schemas/m7-phase3/rpc.schema.json").read_text(encoding="utf-8"))
RPC_REGISTRY = Registry().with_resource("urn:campusloop:m7:processed:v1", Resource.from_contents(DATA_SCHEMA))
RPC_VALIDATOR = Draft202012Validator(RPC_SCHEMA, registry=RPC_REGISTRY, format_checker=FORMATS)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def invalid_constant(value):
    raise ValueError("nonfinite JSON value")


def create_server(address, store, token):
    if address[0] != "127.0.0.1" or not isinstance(token, str) or len(token) < 32:
        raise ValueError("loopback address and >=32-character service token required")
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(3)

        def reply(self, status, content):
            encoded = json.dumps(content, ensure_ascii=False, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(encoded)

        def do_POST(self):
            started = time.monotonic()
            status, code = 200, "OK"
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 8 * 1024 * 1024 or self.headers.get("Transfer-Encoding"):
                    raise ServiceError(413, "PAYLOAD_TOO_LARGE")
                # Drain the bounded body before closing HTTP/1.0 to avoid a TCP
                # reset masking the structured auth error on Windows.
                raw = self.rfile.read(length)
                if not hmac.compare_digest(self.headers.get("Authorization", "").encode("utf-8"), ("Bearer " + token).encode("utf-8")):
                    raise ServiceError(401, "UNAUTHORIZED")
                if self.path not in {"/v1/rank", "/v1/page"}:
                    raise ServiceError(404, "NOT_FOUND")
                if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
                    raise ServiceError(415, "UNSUPPORTED_MEDIA_TYPE")
                payload = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object, parse_constant=invalid_constant)
                if not RPC_VALIDATOR.is_valid(payload):
                    raise ServiceError(422, "VALIDATION_ERROR")
                required = {"schemaVersion", "products", "request", "dictionary"}
                if not isinstance(payload, dict) or not required <= set(payload) or not set(payload) <= required | {"options"} or payload["schemaVersion"] != "m7-baseline-rpc-v1":
                    raise ServiceError(422, "VALIDATION_ERROR")
                options = payload.get("options", {})
                allowed = {"mode", "sort"} if self.path == "/v1/rank" else {"mode", "sort", "size", "snapshotVersion", "scanPosition"}
                if not isinstance(options, dict) or not set(options) <= allowed:
                    raise ServiceError(422, "VALIDATION_ERROR")
                data = (rank if self.path == "/v1/rank" else store.page)(payload["products"], payload["request"], payload["dictionary"], **options)
                asof = datetime.fromisoformat(payload["request"]["context"]["asOf"].replace("Z", "+00:00"))
                age = (datetime.now(timezone.utc) - asof).total_seconds()
                if not 0 <= age <= (300 if options.get("snapshotVersion") else 60):
                    raise ServiceError(409, "STALE_INPUT")
                wanted = payload["request"]["wanted"]
                if wanted is not None and datetime.fromisoformat(wanted["expiresAt"].replace("Z", "+00:00")) <= datetime.now(timezone.utc):
                    raise ServiceError(409, "WANTED_INACTIVE")
                self.reply(200, {"schemaVersion": "m7-baseline-rpc-v1", "data": data})
            except ServiceError as error:
                status, code = error.status, error.code
                self.reply(status, {"schemaVersion": "m7-baseline-rpc-v1", "error": {"code": code}})
            except (ValueError, TypeError, KeyError, RecursionError):
                status, code = 422, "VALIDATION_ERROR"
                self.reply(status, {"schemaVersion": "m7-baseline-rpc-v1", "error": {"code": code}})
            except (TimeoutError, OSError):
                status, code = 503, "DEPENDENCY_UNAVAILABLE"
                try:
                    self.reply(status, {"schemaVersion": "m7-baseline-rpc-v1", "error": {"code": code}})
                except OSError:
                    pass
            finally:
                LOGGER.info("operation=rpc status=%s code=%s durationMs=%d", status, code, (time.monotonic() - started) * 1000)

        def log_message(self, *args):
            pass
    return HTTPServer(address, Handler)
