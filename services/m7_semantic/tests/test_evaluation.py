import copy
import unittest
from services.m7_baseline.evaluate import evaluate_fixed
from scripts.intelligence_phase2.metrics import evaluate
from services.m7_semantic.evaluate import percentile


class EvaluationTests(unittest.TestCase):
    def test_comparison_uses_identical_queries_labels_and_metric_function(self):
        source = evaluate_fixed()["envelopes"]["test_candidate"]
        document = copy.deepcopy(source)
        document["runs"].append(copy.deepcopy(document["runs"][0]))
        document["runs"][1]["algorithmVersion"] = "candidate-with-same-rankings"
        result = evaluate(document)
        self.assertEqual(result["runs"][0]["byTask"], result["runs"][1]["byTask"])
        self.assertEqual(result["status"], "DIAGNOSTIC_ONLY")
        self.assertEqual(source["requests"], document["requests"])

    def test_missing_query_cannot_be_silently_dropped(self):
        from scripts.intelligence_phase2.metrics import EvaluationError
        document = evaluate_fixed()["envelopes"]["test_candidate"]
        document["runs"][0]["rankings"].pop(next(iter(document["runs"][0]["rankings"])))
        with self.assertRaises(EvaluationError):
            evaluate(document)

    def test_latency_percentile_uses_nearest_rank_and_empty_is_unknown(self):
        self.assertEqual(percentile([4, 3, 2, 1], .95), 4)
        self.assertIsNone(percentile([], .95))


if __name__ == "__main__":
    unittest.main()
