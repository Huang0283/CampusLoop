from __future__ import annotations

import time
import unittest
import json
from pathlib import Path
from unittest.mock import patch

from services.m8_phase4.evaluate import evaluate_price, evaluate_trust_risk
from services.m8_phase4.metrics import regression_metrics
from services.m8_phase4.readiness import inspect
from services.m8_phase4.router import route_price


PAYLOAD = {
    "category": "digital", "condition": "good", "originalPriceFen": 600000,
    "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": [],
}
NO_GO = {"decision": "NO_GO", "candidateServingAllowed": False}
GO = {"decision": "GO_FOR_CANDIDATE_TRAINING", "candidateServingAllowed": True}


def candidate(**changes):
    value = {
        "status": "AVAILABLE",
        "modelVersion": "m8-price-candidate-v1",
        "featureVersion": "m8-price-features-v1",
        "confidence": "HIGH",
        "recommendedFen": 250000,
        "intervalFen": {"lower": 200000, "upper": 300000},
        "factors": [{"code": "CONDITION", "explanation": "Condition contribution"}],
    }
    value.update(changes)
    return value


class ReadinessTests(unittest.TestCase):
    def test_current_data_is_no_go(self):
        result = inspect()
        self.assertEqual("NO_GO", result["decision"])
        self.assertEqual(0, result["counts"]["eligibleL3"])
        self.assertIn("eligible-l3-count", result["reasonCodes"])
        self.assertFalse(result["safety"]["listingPriceUsedAsLabel"])


class MetricsTests(unittest.TestCase):
    def test_no_l3_is_not_evaluated(self):
        result = regression_metrics([])
        self.assertEqual("NOT_EVALUATED", result["status"])
        self.assertIsNone(result["mape"])

    def test_metrics_use_l3_truth(self):
        result = regression_metrics([
            {"labelLevel": "L3_COMPLETED_TRANSACTION", "transactionPriceFen": 100, "recommendedFen": 90, "lowerFen": 80, "upperFen": 110},
            {"labelLevel": "L0_SYNTHETIC", "transactionPriceFen": 1, "recommendedFen": 1000, "lowerFen": 1, "upperFen": 1000},
        ])
        self.assertEqual(1, result["eligibleL3Count"])
        self.assertEqual(10, result["maeFen"])
        self.assertEqual(0.1, result["mape"])
        self.assertEqual(1.0, result["intervalCoverage"])

    def test_invalid_price_intervals_are_not_scored(self):
        row = {"labelLevel": "L3_COMPLETED_TRANSACTION", "transactionPriceFen": 100, "recommendedFen": 90, "lowerFen": 80, "upperFen": 110}
        for change in ({"lowerFen": True}, {"upperFen": False}, {"lowerFen": 120}, {"recommendedFen": -1}, {"lowerFen": -1}):
            with self.subTest(change=change):
                self.assertEqual(regression_metrics([{**row, **change}])["status"], "NOT_EVALUATED")


class RouterTests(unittest.TestCase):
    def test_contract_versions_and_fallbacks_match_router(self):
        contract = json.loads((Path(__file__).resolve().parents[3] / "contracts/m8-phase4/service-contract.json").read_text(encoding="utf-8"))
        self.assertEqual("m8-price-phase4-router-v1", contract["contractVersion"])
        self.assertIn("CANDIDATE_TIMEOUT", contract["fallbackReasons"])
        self.assertFalse(contract["businessWritesAllowed"])
        self.assertFalse(contract["riskEnforcementAllowed"])

    def test_disabled_is_phase3(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=False, candidate=lambda _: candidate())
        self.assertEqual("PHASE3_RULE_BASELINE", result["selectedEngine"])
        self.assertFalse(result["candidateRequested"])

    def test_no_go_cannot_invoke_candidate(self):
        invoked = []
        result = route_price(PAYLOAD, NO_GO, candidate_enabled=True, candidate=lambda _: invoked.append(True))
        self.assertEqual([], invoked)
        self.assertEqual("DATA_OR_APPROVAL_GATE_NO_GO", result["fallbackReason"])

    def test_missing_model_falls_back(self):
        self.assertEqual("CANDIDATE_MODEL_MISSING", route_price(PAYLOAD, GO, candidate_enabled=True)["fallbackReason"])

    def test_timeout_falls_back(self):
        def slow(_):
            time.sleep(0.02)
            return candidate()
        self.assertEqual("CANDIDATE_TIMEOUT", route_price(PAYLOAD, GO, candidate_enabled=True, candidate=slow, timeout_ms=1)["fallbackReason"])

    def test_error_falls_back(self):
        def broken(_):
            raise RuntimeError("do not expose")
        self.assertEqual("CANDIDATE_ERROR", route_price(PAYLOAD, GO, candidate_enabled=True, candidate=broken)["fallbackReason"])

    def test_no_result_falls_back(self):
        self.assertEqual("CANDIDATE_NO_RESULT", route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: None)["fallbackReason"])

    def test_low_confidence_falls_back(self):
        self.assertEqual("CANDIDATE_LOW_CONFIDENCE", route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(confidence="LOW"))["fallbackReason"])

    def test_version_mismatch_falls_back(self):
        self.assertEqual("CANDIDATE_VERSION_MISMATCH", route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(modelVersion="other"))["fallbackReason"])

    def test_invalid_boundary_or_explanation_falls_back(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(intervalFen={"lower": 2, "upper": 1}, factors=[]))
        self.assertEqual("CANDIDATE_INVALID_RESULT", result["fallbackReason"])

    def test_valid_candidate_is_selected(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate())
        self.assertEqual("PHASE4_PRICE_CANDIDATE", result["selectedEngine"])
        self.assertFalse(result["fallbackApplied"])

    def test_unavailable_candidate_cannot_be_selected(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(status="UNAVAILABLE"))
        self.assertEqual("CANDIDATE_INVALID_RESULT", result["fallbackReason"])

    def test_interval_unknown_fields_are_rejected(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(intervalFen={"lower": 200000, "upper": 300000, "email": "private"}))
        self.assertEqual("CANDIDATE_INVALID_RESULT", result["fallbackReason"])

    def test_malformed_confidence_falls_back_without_raising(self):
        result = route_price(PAYLOAD, GO, candidate_enabled=True, candidate=lambda _: candidate(confidence=[]))
        self.assertEqual("CANDIDATE_LOW_CONFIDENCE", result["fallbackReason"])

    def test_rollback_restores_identical_phase3_output(self):
        enabled = route_price(PAYLOAD, NO_GO, candidate_enabled=True, candidate=lambda _: candidate())
        disabled = route_price(PAYLOAD, NO_GO, candidate_enabled=False, candidate=lambda _: candidate())
        self.assertEqual(enabled["data"], disabled["data"])


class EvaluationTests(unittest.TestCase):
    def test_untrained_candidate_never_copies_baseline_accuracy(self):
        from services.m8_phase4 import evaluate as module
        row = module._records()[0]
        row = {**row, "labelLevel": "L3_COMPLETED_TRANSACTION", "transactionPriceFen": 550000}
        with patch.object(module, "inspect", return_value={"decision": "NO_GO", "checks": [{"observed": "test-only"}]}), patch.object(module, "_records", return_value=[row]):
            result = module.evaluate_price()
        self.assertEqual(result["comparison"]["baselineMetrics"]["status"], "EVALUATED")
        self.assertEqual(result["comparison"]["candidateMetrics"]["status"], "NOT_EVALUATED")
        self.assertIsNone(result["comparison"]["candidateMetrics"]["maeFen"])

    def test_price_evaluation_is_honest_and_deterministic(self):
        first, second = evaluate_price(), evaluate_price()
        self.assertEqual(first, second)
        self.assertEqual("NOT_EVALUATED", first["comparison"]["baselineMetrics"]["status"])
        self.assertEqual(1.0, first["comparison"]["fallbackParityRate"])
        self.assertEqual(12, len(first["results"]))

    def test_trust_risk_never_auto_penalizes(self):
        result = evaluate_trust_risk()
        self.assertTrue(result["passed"])
        self.assertTrue(result["checks"]["riskNeverAutoEnforces"])
        self.assertEqual("NOT_RUN_NO_APPROVED_LABELS", result["riskModelExperiment"])


if __name__ == "__main__":
    unittest.main()
