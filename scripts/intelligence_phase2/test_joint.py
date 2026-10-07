import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from jsonschema.exceptions import ValidationError

import asset_check
import gate_check
import metrics


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "contracts/intelligence-phase2/ranking-formula-fixture.json"


class MetricTests(unittest.TestCase):
    def setUp(self):
        self.document = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def summary(self, task="search", key="label>=2@5"):
        return metrics.evaluate(self.document)["runs"][0]["byTask"][task]["metrics"][key]

    def test_phase1_hand_calculation(self):
        summary = self.summary()
        self.assertAlmostEqual(summary["precision"], 0.3)
        self.assertEqual(summary["recall"], 0.5)
        self.assertEqual(summary["mrr"], 0.75)
        self.assertEqual(summary["noAnswerEmptyAccuracy"], 1)

    def test_short_ranking_divides_by_k(self):
        rows = metrics.evaluate(self.document)["runs"][0]["perRequest"]
        row = next(r for r in rows if r["requestId"] == "Q2")
        self.assertEqual(row["metrics"]["label>=2@5"]["precision"], 0.2)

    def test_unknown_excludes_whole_query_but_keeps_audit(self):
        report = metrics.evaluate(self.document)["runs"][0]
        row = next(r for r in report["perRequest"] if r["requestId"] == "MU")
        self.assertEqual(row["metrics"], {})
        self.assertEqual(row["hardViolationCount"], 1)
        self.assertEqual(report["byTask"]["matching"]["excludedRequestCount"], 1)

    def test_no_positive_denominator_is_null(self):
        summary = self.summary("matching")
        self.assertIsNone(summary["recall"])
        self.assertIsNone(summary["mrr"])
        self.assertEqual(summary["falseRecommendationCount"], 1)

    def test_deduplicate_before_top_k(self):
        self.document["runs"][0]["rankings"]["Q1"] = ["a", "a", "x", "b", "y", "z"]
        self.assertAlmostEqual(self.summary()["precision"], 0.3)

    def test_missing_query_fails(self):
        del self.document["runs"][0]["rankings"]["Q1"]
        with self.assertRaisesRegex(metrics.EvaluationError, "complete request set"):
            metrics.evaluate(self.document)

    def test_unknown_returned_product_fails(self):
        self.document["runs"][0]["rankings"]["Q1"].append("unjudged")
        with self.assertRaisesRegex(metrics.EvaluationError, "no label"):
            metrics.evaluate(self.document)

    def test_duplicate_label_fails(self):
        self.document["requests"][0]["labels"].append(copy.deepcopy(self.document["requests"][0]["labels"][0]))
        with self.assertRaisesRegex(metrics.EvaluationError, "duplicate"):
            metrics.evaluate(self.document)

    def test_empty_input_fails(self):
        self.document["requests"] = []
        with self.assertRaisesRegex(metrics.EvaluationError, "empty"):
            metrics.evaluate(self.document)

    def test_bool_is_not_label_or_k(self):
        for field in ("label", "k"):
            changed = copy.deepcopy(self.document)
            if field == "label":
                changed["requests"][0]["labels"][0]["label"] = True
            else:
                changed["kValues"] = [True]
            with self.assertRaises(metrics.EvaluationError):
                metrics.evaluate(changed)

    def test_sensitivity_report_is_separate(self):
        self.document["requests"][0]["labels"][1]["label"] = 1
        self.assertNotEqual(self.summary()["precision"], self.summary(key="label>=1@5")["precision"])

    def test_cannot_claim_approved_labels(self):
        self.document["labelSource"] = "HUMAN_REVIEWED"
        with self.assertRaisesRegex(metrics.EvaluationError, "diagnostic"):
            metrics.evaluate(self.document)

    def test_same_labels_across_algorithms(self):
        other = copy.deepcopy(self.document["runs"][0])
        other["algorithmVersion"] = "formula-comparison-only"
        self.document["runs"].append(other)
        result = metrics.evaluate(self.document)
        self.assertEqual(result["runs"][0]["byTask"], result["runs"][1]["byTask"])


class AssetTests(unittest.TestCase):
    def make_root(self, target):
        for path in ("scripts/m8_phase2", "data/m8-phase2", "schemas/m8-phase2"):
            shutil.copytree(ROOT / path, target / path)

    def test_m8_committed_bytes_and_read_only(self):
        self.assertTrue(asset_check.verify_price()["readOnly"])

    def test_tampered_derived_fails_without_repairing_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_root(root)
            file = root / "data/m8-phase2/derived/metrics.json"
            file.write_bytes(file.read_bytes() + b" ")
            before = file.read_bytes()
            with self.assertRaisesRegex(ValueError, "committed bytes differ"):
                asset_check.verify_price(root)
            self.assertEqual(file.read_bytes(), before)

    def test_schema_rejects_invalid_brand(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_root(root)
            file = root / "data/m8-phase2/raw/price-samples.jsonl"
            rows = [json.loads(line) for line in file.read_text(encoding="utf-8").splitlines()]
            rows[0]["brand"] = 123
            file.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8", newline="\n")
            with self.assertRaises(ValidationError):
                asset_check.verify_price(root)

    def test_synthetic_source_cannot_claim_real_transaction_labels(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_root(root)
            file = root / "data/m8-phase2/raw/price-samples.jsonl"
            rows = [json.loads(line) for line in file.read_text(encoding="utf-8").splitlines()]
            rows[0].update(labelLevel="L3_COMPLETED_TRANSACTION", transactionPriceFen=100,
                           completedAt=rows[0]["listedAt"])
            file.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8", newline="\n")
            with self.assertRaisesRegex(ValueError, "synthetic source cannot claim"):
                asset_check.verify_price(root)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads(gate_check.POLICY.read_text(encoding="utf-8"))

    def test_current_missing_signatures_and_labels_are_no_go(self):
        result = gate_check.check(self.policy)
        self.assertFalse(result["deploymentAuthorized"])
        self.assertTrue(all(r["registration"] == "NO_GO" for r in result["capabilities"]))
        self.assertTrue(all("APPROVAL_MISSING_M10" in r["reasons"] for r in result["capabilities"]))

    def test_blank_threshold_is_no_go(self):
        self.policy["capabilities"][0]["thresholds"]["mrrAt10Min"] = None
        self.assertIn("NUMERIC_THRESHOLDS_MISSING_OR_INVALID",
                      gate_check.check(self.policy)["capabilities"][0]["reasons"])

    def test_removing_required_approver_does_not_bypass_gate(self):
        self.policy["capabilities"][0]["approvals"] = {}
        self.assertIn("APPROVAL_MISSING_M1", gate_check.check(self.policy)["capabilities"][0]["reasons"])

    def test_missing_capability_fails(self):
        self.policy["capabilities"].pop()
        with self.assertRaisesRegex(ValueError, "capability"):
            gate_check.check(self.policy)


if __name__ == "__main__":
    unittest.main()
