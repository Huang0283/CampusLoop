from copy import deepcopy
import unittest

from services.m8_baseline.engine import ServiceError, price_advice, risk_clues, trust_summary


PRICE = {"category": "digital", "condition": "good", "originalPriceFen": 600000,
         "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": []}
RISK = {"failedPaymentCount24h": 0, "listingCount1h": 2, "distinctCounterpartyCount24h": 1,
        "sameDeviceAccountCount7d": 1, "reportCount7d": 0}


class PriceTests(unittest.TestCase):
    def test_interval_is_ordered_and_not_exact_promise(self):
        result = price_advice(PRICE)
        self.assertLessEqual(result["intervalFen"]["lower"], result["intervalFen"]["upper"])
        self.assertNotIn("guaranteedPriceFen", result)
        self.assertIn("不保证成交", result["disclaimer"])

    def test_missing_anchor_is_insufficient(self):
        payload = {**PRICE, "originalPriceFen": None}
        result = price_advice(payload)
        self.assertEqual("INSUFFICIENT_DATA", result["status"])
        self.assertEqual({"lower": None, "upper": None}, result["intervalFen"])

    def test_rejects_boolean_price(self):
        with self.assertRaises(ServiceError):
            price_advice({**PRICE, "originalPriceFen": True})


class TrustTests(unittest.TestCase):
    def test_new_user_is_neutral(self):
        result = trust_summary({"events": []})
        self.assertEqual(("NEW_USER_NEUTRAL", 3.5), (result["status"], result["score"]))

    def test_cancelled_disputed_and_invalid_do_not_increase_score(self):
        events = [
            {"type": "SALE", "status": "CANCELLED", "disputed": False, "invalid": False, "rating": 5},
            {"type": "SALE", "status": "COMPLETED", "disputed": True, "invalid": False, "rating": 5},
            {"type": "REVIEW", "status": "COMPLETED", "disputed": False, "invalid": True, "rating": 5},
        ]
        result = trust_summary({"events": events})
        self.assertEqual(3.5, result["score"])
        self.assertEqual((0, 3), (result["validEventCount"], result["ignoredEventCount"]))

    def test_smoothing_limits_small_sample(self):
        event = {"type": "SALE", "status": "COMPLETED", "disputed": False, "invalid": False, "rating": 5}
        result = trust_summary({"events": [event]})
        self.assertGreater(result["score"], 3.5)
        self.assertLess(result["score"], 5)


class RiskTests(unittest.TestCase):
    def test_missing_observation_is_not_a_zero_risk_claim(self):
        result = risk_clues({**RISK, "failedPaymentCount24h": None, "sameDeviceAccountCount7d": None})
        self.assertEqual("INSUFFICIENT_DATA", result["status"])
        self.assertEqual(["failedPaymentCount24h", "sameDeviceAccountCount7d"], result["missingInputs"])
        self.assertFalse(result["enforcementExecuted"])

    def test_no_clue_has_no_review(self):
        result = risk_clues(RISK)
        self.assertEqual("NO_RULE_CLUES", result["status"])
        self.assertFalse(result["manualReviewRecommended"])

    def test_threshold_emits_explanation_but_no_penalty(self):
        result = risk_clues({**RISK, "failedPaymentCount24h": 3})
        self.assertEqual("REPEATED_PAYMENT_FAILURES", result["clues"][0]["code"])
        self.assertTrue(result["manualReviewRecommended"])
        self.assertFalse(result["enforcementExecuted"])

    def test_input_is_not_mutated(self):
        payload = {**RISK, "reportCount7d": 4}
        before = deepcopy(payload)
        risk_clues(payload)
        self.assertEqual(before, payload)


if __name__ == "__main__":
    unittest.main()
