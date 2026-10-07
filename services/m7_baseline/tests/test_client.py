from datetime import datetime, timezone
import socket
import threading
import unittest
import test_engine as fixtures
from services.m7_baseline.client import call_baseline


class FallbackTests(unittest.TestCase):
    def test_closed_service_returns_filtered_local_baseline_with_degradation_reason(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        fixture.request["context"]["asOf"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = dict(schemaVersion="m7-baseline-rpc-v1", products=[fixture.product], request=fixture.request,
                       dictionary=fixture.dictionary)
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
            # Windows may time out rather than refuse a bound non-listening port.
            result = call_baseline(f"http://127.0.0.1:{port}", payload, "test-only-service-token-32-characters", timeout=0.2)
        self.assertEqual(result["items"][0]["productId"], "101")
        self.assertTrue(result["metadata"]["degraded"])
        self.assertIn(result["metadata"]["fallbackReason"], {"SERVICE_UNAVAILABLE", "SERVICE_TIMEOUT"})

    def test_connection_closed_mid_request_also_returns_local_fallback(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        fixture.request["context"]["asOf"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = dict(schemaVersion="m7-baseline-rpc-v1", products=[fixture.product], request=fixture.request,
                       dictionary=fixture.dictionary)
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen(1)
            def drop():
                connection, _ = listener.accept()
                connection.close()
            thread = threading.Thread(target=drop, daemon=True)
            thread.start()
            result = call_baseline(f"http://127.0.0.1:{listener.getsockname()[1]}", payload,
                                   "test-only-service-token-32-characters", timeout=0.2)
            thread.join(3)
        self.assertTrue(result["metadata"]["degraded"])
        self.assertEqual(result["metadata"]["fallbackReason"], "SERVICE_UNAVAILABLE")
