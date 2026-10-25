"""Synthetic fixtures test gates only; they are never accepted training data."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import tempfile
import unittest

from scripts.m8_phase2.pipeline import DataError
from services.m8_phase4.transaction_dataset import (
    POLICY,
    REQUIRED_EXPORT_FIELDS,
    authorization_check,
    build_snapshot,
    write_snapshot,
)


class TransactionDatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = json.loads(POLICY.read_text(encoding="utf-8"))

    def authorization(self):
        return {
            "authorizationVersion": "m8-transaction-authorization-v1",
            "sourceId": "PDS-02",
            "purpose": "price_candidate_training_and_evaluation",
            "status": "APPROVED",
            "dataMinimizationConfirmed": True,
            "retentionDays": 30,
            "approvedFields": sorted(REQUIRED_EXPORT_FIELDS),
            "approvals": {
                "M5": {"approver": "test-m5", "approvedAt": "2026-10-25T08:00:00+08:00", "evidence": "TEST ONLY"},
                "M6": {"approver": "test-m6", "approvedAt": "2026-10-25T08:01:00+08:00", "evidence": "TEST ONLY"},
            },
        }

    def row(self, number=1, category="digital"):
        return {
            "schemaVersion": "m8-authorized-order-v1",
            "orderReference": f"fixture-order-{number}",
            "status": "COMPLETED",
            "buyerConfirmedComplete": True,
            "sellerConfirmedComplete": True,
            "amountFen": 50000 + number,
            "category": category,
            "brand": None,
            "model": None,
            "condition": "good",
            "originalPriceFen": 100000,
            "purchaseAgeMonths": 12,
            "accessoryState": "complete",
            "defectTags": [],
            "listedAt": "2026-09-01T08:00:00+08:00",
            "completedAt": "2026-09-02T08:00:00+08:00",
            "extractedAt": "2026-10-25T08:00:00+08:00",
            "refundStatus": "NONE",
            "disputeStatus": "NONE",
            "invalidated": False,
        }

    def ready_rows(self):
        categories = self.policy["requiredCategorySlices"]
        return [self.row(number, categories[number % len(categories)]) for number in range(200)]

    def test_pending_or_incomplete_authorization_fails_closed(self):
        for change in (
            {"status": "PENDING"},
            {"dataMinimizationConfirmed": False},
            {"retentionDays": None},
            {"approvedFields": []},
            {"approvedFields": [{}]},
            {"approvals": {"M5": self.authorization()["approvals"]["M5"], "M6": None}},
        ):
            with self.subTest(change=change):
                authorization = self.authorization()
                authorization.update(change)
                self.assertFalse(authorization_check(authorization, self.policy)["passed"])

    def test_refund_dispute_invalidation_and_one_sided_completion_are_excluded(self):
        rows = self.ready_rows()
        rows[0]["refundStatus"] = "REQUESTED"
        rows[1]["disputeStatus"] = "RESOLVED"
        rows[2]["invalidated"] = True
        rows[3]["buyerConfirmedComplete"] = False
        _, report = build_snapshot(rows, self.authorization(), self.policy, b"x" * 32)
        self.assertEqual("NO_GO", report["decision"])
        self.assertEqual(196, report["counts"]["eligibleL3"])
        self.assertEqual(1, report["rejectionReasons"]["REFUND_HISTORY_PRESENT"])
        self.assertEqual(1, report["rejectionReasons"]["DISPUTE_HISTORY_PRESENT"])
        self.assertEqual(1, report["rejectionReasons"]["ORDER_INVALIDATED"])
        self.assertEqual(1, report["rejectionReasons"]["BILATERAL_COMPLETION_MISSING"])

    def test_all_required_categories_and_total_count_are_enforced(self):
        samples, report = build_snapshot(self.ready_rows(), self.authorization(), self.policy, b"x" * 32)
        self.assertEqual("READY_TO_FREEZE", report["decision"])
        self.assertEqual(200, len(samples))
        self.assertFalse(report["privacy"]["rawOrderReferenceRetained"])
        self.assertTrue(all(row["sampleId"].startswith("m8-l3-") for row in samples))
        self.assertTrue(all(row["expectedStatus"] == "LOW_CONFIDENCE" for row in samples))
        one_category = [self.row(number, "digital") for number in range(200)]
        _, failed = build_snapshot(one_category, self.authorization(), self.policy, b"x" * 32)
        self.assertEqual("NO_GO", failed["decision"])
        self.assertEqual(set(self.policy["requiredCategorySlices"]) - {"digital"}, set(failed["missingCategorySamples"]))

    def test_identity_or_unknown_fields_are_rejected_not_silently_dropped(self):
        for field in ("buyerId", "email", "unexpected"):
            with self.subTest(field=field):
                row = self.row()
                row[field] = "private"
                with self.assertRaises(DataError):
                    build_snapshot([row], self.authorization(), self.policy, b"x" * 32)

    def test_malformed_prices_and_defect_tags_fail_closed(self):
        for change in ({"amountFen": None}, {"amountFen": True}, {"defectTags": [{}]}):
            with self.subTest(change=change):
                row = self.row()
                row.update(change)
                with self.assertRaises(DataError):
                    build_snapshot([row], self.authorization(), self.policy, b"x" * 32)

    def test_key_is_required_and_changes_pseudonym(self):
        with self.assertRaises(DataError):
            build_snapshot([self.row()], self.authorization(), self.policy, b"short")
        first, _ = build_snapshot([self.row()], self.authorization(), self.policy, b"a" * 32)
        second, _ = build_snapshot([self.row()], self.authorization(), self.policy, b"b" * 32)
        self.assertNotEqual(first[0]["sampleId"], second[0]["sampleId"])

    def test_raw_export_inside_repository_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=POLICY.parents[2]) as directory:
            input_path = Path(directory) / "raw.jsonl"
            input_path.write_text(json.dumps(self.row()) + "\n", encoding="utf-8")
            auth_path = Path(directory) / "auth.json"
            auth_path.write_text(json.dumps(self.authorization()), encoding="utf-8")
            with self.assertRaises(DataError):
                write_snapshot(input_path, Path(directory) / "output", auth_path, b"x" * 32)


if __name__ == "__main__":
    unittest.main()
