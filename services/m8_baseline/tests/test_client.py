import unittest
from unittest.mock import patch
from urllib.error import URLError

from services.m8_baseline.client import call, fallback


class ClientTests(unittest.TestCase):
    def test_risk_fallback_never_enforces(self):
        result = fallback("risk", "SERVICE_UNAVAILABLE")
        self.assertFalse(result["enforcementExecuted"])
        self.assertEqual("STORE_REPORT_FOR_MANUAL_QUEUE", result["fallback"])

    @patch("services.m8_baseline.client.urlopen", side_effect=URLError("offline"))
    def test_network_failure_degrades(self, _urlopen):
        result = call("http://127.0.0.1:9", "price", {}, "x" * 32)
        self.assertEqual("MANUAL_PRICE_ENTRY", result["fallback"])


if __name__ == "__main__":
    unittest.main()
