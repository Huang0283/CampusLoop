"""Real loopback fault probes; not mocks of the transport."""
import json
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from services.m8_baseline.client import call
from services.m8_baseline.engine import evaluate


TOKEN = "test-only-m8-rpc-000000000000000000000000"
PAYLOADS = {
    "price": {"category": "digital", "condition": "good", "originalPriceFen": 600000,
              "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": []},
    "trust": {"events": []},
    "risk": {"failedPaymentCount24h": None, "listingCount1h": 12,
             "distinctCounterpartyCount24h": 0, "sameDeviceAccountCount7d": None, "reportCount7d": 0},
}


class ClientHttpTests(unittest.TestCase):
    def setUp(self):
        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                self.rfile.read(int(self.headers.get("Content-Length", "0")))
                time.sleep(self.server.delay)
                body = self.server.body
                try:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def log_message(self, *_args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.body = b"{}"
        self.server.delay = 0
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = "http://127.0.0.1:" + str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)

    def probe(self, task):
        return call(self.url, task, PAYLOADS[task], TOKEN, timeout=0.1)

    def assert_safe(self, task, reason="INVALID_SERVICE_RESPONSE"):
        value = self.probe(task)
        self.assertEqual("UNAVAILABLE", value["status"])
        self.assertIs(value["degraded"], True)
        self.assertEqual(reason, value["degradationReason"])
        if task == "price":
            self.assertEqual({"lower": None, "upper": None}, value["intervalFen"])
        if task == "risk":
            self.assertIs(value["enforcementExecuted"], False)

    def test_normal_rpc_preserves_each_engine_output(self):
        for task, payload in PAYLOADS.items():
            with self.subTest(task=task):
                expected = evaluate(task, payload)
                self.server.body = json.dumps({"schemaVersion": "m8-baseline-rpc-v1", "data": expected}).encode()
                self.assertEqual(expected, self.probe(task))

    def test_empty_or_missing_data_degrades_all_three_capabilities(self):
        for body in (b'{"schemaVersion":"m8-baseline-rpc-v1","data":{}}',
                     b'{"schemaVersion":"m8-baseline-rpc-v1"}'):
            self.server.body = body
            for task in PAYLOADS:
                with self.subTest(task=task, body=body):
                    self.assert_safe(task)

    def test_invalid_json_degrades_all_three_capabilities(self):
        self.server.body = b"not-json"
        for task in PAYLOADS:
            with self.subTest(task=task):
                self.assert_safe(task)

    def test_wrong_algorithm_version_degrades_all_three_capabilities(self):
        for task, payload in PAYLOADS.items():
            with self.subTest(task=task):
                value = {**evaluate(task, payload), "algorithmVersion": "old-v0"}
                self.server.body = json.dumps({"schemaVersion": "m8-baseline-rpc-v1", "data": value}).encode()
                self.assert_safe(task)

    def test_timeout_degrades_all_three_capabilities(self):
        self.server.delay = 0.3
        for task in PAYLOADS:
            with self.subTest(task=task):
                self.assert_safe(task, "SERVICE_TIMEOUT_OR_UNAVAILABLE")

    def test_closed_service_degrades_all_three_capabilities(self):
        self.server.shutdown()
        self.server.server_close()
        for task in PAYLOADS:
            with self.subTest(task=task):
                self.assert_safe(task, "SERVICE_TIMEOUT_OR_UNAVAILABLE")
