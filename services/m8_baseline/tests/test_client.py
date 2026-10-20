import unittest
import json
from copy import deepcopy
from unittest.mock import patch
from urllib.error import URLError
from io import BytesIO

from services.m8_baseline.client import call, fallback
from services.m8_baseline.engine import price_advice, trust_summary, risk_clues

PRICE = {"category": "digital", "condition": "good", "originalPriceFen": 600000,
         "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": []}
RISK = {"failedPaymentCount24h": None, "listingCount1h": 12,
        "distinctCounterpartyCount24h": 0, "sameDeviceAccountCount7d": None, "reportCount7d": 0}


class ClientTests(unittest.TestCase):
    def test_risk_fallback_never_enforces(self):
        result = fallback("risk", "SERVICE_UNAVAILABLE")
        self.assertFalse(result["enforcementExecuted"])
        self.assertEqual("STORE_REPORT_FOR_MANUAL_QUEUE", result["fallback"])

    @patch("services.m8_baseline.client.build_opener")
    def test_network_failure_degrades(self, opener):
        opener.return_value.open.side_effect = URLError("offline")
        result = call("http://127.0.0.1:9", "price", {}, "x" * 32)
        self.assertEqual("MANUAL_PRICE_ENTRY", result["fallback"])

    def request(self, task, value=None, raw=None):
        if raw is None:
            raw = json.dumps({"schemaVersion": "m8-baseline-rpc-v1", "data": value}).encode()
        with patch("services.m8_baseline.client.build_opener") as opener:
            opener.return_value.open.return_value = BytesIO(raw)
            return call("http://127.0.0.1:8108", task, {}, "x" * 32)

    def assert_unavailable(self, task, result):
        self.assertEqual("UNAVAILABLE", result["status"])
        self.assertTrue(result["degraded"])
        self.assertEqual("INVALID_SERVICE_RESPONSE", result["degradationReason"])
        if task == "price":
            self.assertEqual({"lower": None, "upper": None}, result["intervalFen"])
        if task == "risk":
            self.assertIs(result["enforcementExecuted"], False)

    def outputs(self):
        return {"price": price_advice(PRICE), "trust": trust_summary({"events": []}), "risk": risk_clues(RISK)}

    def test_valid_engine_outputs_are_preserved(self):
        for task, value in self.outputs().items():
            with self.subTest(task=task):
                self.assertEqual(value, self.request(task, value))
        missing_anchor = price_advice({**PRICE, "originalPriceFen": None})
        self.assertEqual(missing_anchor, self.request("price", missing_anchor))
        neutral_risk = risk_clues({key: 0 for key in RISK})
        self.assertEqual(neutral_risk, self.request("risk", neutral_risk))
        event = {"type": "SALE", "status": "COMPLETED", "disputed": False, "invalid": False, "rating": 5}
        established = trust_summary({"events": [event]})
        self.assertEqual(established, self.request("trust", established))

    def test_empty_and_missing_data_degrade_for_all_tasks(self):
        for task in self.outputs():
            for raw in (b'{"schemaVersion":"m8-baseline-rpc-v1","data":{}}',
                        b'{"schemaVersion":"m8-baseline-rpc-v1"}'):
                with self.subTest(task=task, raw=raw):
                    self.assert_unavailable(task, self.request(task, raw=raw))

    def test_every_missing_output_field_degrades(self):
        for task, value in self.outputs().items():
            for key in value:
                changed = deepcopy(value)
                del changed[key]
                with self.subTest(task=task, missing=key):
                    self.assert_unavailable(task, self.request(task, changed))

    def test_malformed_json_and_non_object_envelopes_degrade(self):
        for task in self.outputs():
            for raw in (b'not-json', b'null', b'[]', b'1', b'"text"', b'\xff',
                        b'{"schemaVersion":"m8-baseline-rpc-v1","data":{},"data":{}}',
                        b'{"schemaVersion":"m8-baseline-rpc-v1","data":{"score":NaN}}'):
                with self.subTest(task=task, raw=raw):
                    self.assert_unavailable(task, self.request(task, raw=raw))

    def test_wrong_versions_and_unknown_fields_degrade(self):
        for task, value in self.outputs().items():
            for changed in ({**value, "algorithmVersion": "old-v0"}, {**value, "email": "private"}):
                with self.subTest(task=task):
                    self.assert_unavailable(task, self.request(task, changed))
            raw = json.dumps({"schemaVersion": "old-v0", "data": value}).encode()
            self.assert_unavailable(task, self.request(task, raw=raw))

    def test_invalid_price_interval_degrades(self):
        value = price_advice(PRICE)
        for interval in ({"lower": 5, "upper": 1}, {"lower": True, "upper": 10},
                         {"lower": None, "upper": None}, {"lower": 1, "upper": 10, "email": "private"}):
            self.assert_unavailable("price", self.request("price", {**value, "intervalFen": interval}))

    def test_invalid_trust_score_and_status_degrade(self):
        value = trust_summary({"events": []})
        for changed in ({**value, "score": True}, {**value, "score": 6}, {**value, "score": 4},
                        {**value, "validEventCount": -1}, {**value, "status": "AVAILABLE"}):
            self.assert_unavailable("trust", self.request("trust", changed))

    def test_risk_cannot_enforce_or_hide_manual_review(self):
        value = risk_clues(RISK)
        for changed in ({**value, "enforcementExecuted": True}, {**value, "recommendedAction": "BAN"},
                        {**value, "status": "NO_RULE_CLUES"}, {**value, "manualReviewRecommended": False}):
            self.assert_unavailable("risk", self.request("risk", changed))


if __name__ == "__main__":
    unittest.main()
