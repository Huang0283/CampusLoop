import unittest
from services.m7_baseline.evaluate import evaluate_fixed


class EvaluationTests(unittest.TestCase):
    def test_fixed_evaluation_covers_38_queries_and_preserves_diagnostic_label_status(self):
        result = evaluate_fixed()
        self.assertEqual(len(result["perQuery"]), 38)
        self.assertEqual(result["metrics"]["all"]["status"], "DIAGNOSTIC_ONLY")
        self.assertFalse(result["metrics"]["all"]["modelEffectEvaluated"])
        for task in result["metrics"]["all"]["runs"][0]["byTask"].values():
            self.assertEqual(task["hardViolationCount"], 0)
        expired = next(q for q in result["perQuery"] if q["requestId"] == "tennis-matching-expired")
        self.assertEqual(expired["errorCode"], "WANTED_INACTIVE")
