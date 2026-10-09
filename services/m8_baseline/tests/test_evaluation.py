import unittest

from services.m8_baseline.evaluate import run


class EvaluationTests(unittest.TestCase):
    def test_all_fixed_cases_pass(self):
        result = run()
        self.assertEqual(result["summary"]["caseCount"], result["summary"]["passed"])
        self.assertEqual("RULE_ONLY_VALIDATION", result["evaluationType"])
        self.assertEqual("NOT_EVALUATED", result["labeledPredictionMetrics"])


if __name__ == "__main__":
    unittest.main()
