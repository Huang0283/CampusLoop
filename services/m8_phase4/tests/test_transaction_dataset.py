"""Synthetic fixtures test gates only; they are never accepted training data."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from scripts.m8_phase2.pipeline import DataError
from services.m8_phase4.readiness import MODEL_GATES, inspect as inspect_readiness
from services.m8_phase4.transaction_dataset import (
    POLICY,
    REQUIRED_EXPORT_FIELDS,
    authorization_check,
    build_snapshot,
    sign_approval,
    write_snapshot,
)
from services.m8_phase4.tests.test_support import (
    sign_authorization as sign_fixture_authorization,
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
                "M5": {
                    "approver": "M5",
                    "approvedAt": "2026-10-25T08:00:00+08:00",
                    "evidence": "https://github.com/Huang0283/CampusLoop/issues/36#issuecomment-1",
                },
                "M6": {
                    "approver": "M6",
                    "approvedAt": "2026-10-25T08:01:00+08:00",
                    "evidence": "https://github.com/Huang0283/CampusLoop/issues/36#issuecomment-2",
                },
            },
        }

    def sign_authorization(self, authorization, directory):
        return sign_fixture_authorization(authorization, self.policy, directory)

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
        return [
            self.row(number, categories[number % len(categories)])
            for number in range(200)
        ]

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
                with tempfile.TemporaryDirectory() as directory:
                    trusted_signers = self.sign_authorization(authorization, directory)
                    self.assertFalse(
                        authorization_check(
                            authorization, self.policy, trusted_signers
                        )["passed"]
                    )

    def test_unsigned_self_attested_approvals_are_rejected(self):
        result = authorization_check(self.authorization(), self.policy)
        self.assertFalse(result["passed"])
        self.assertIn("approval-signature-M5", result["reasonCodes"])
        self.assertIn("approval-signature-M6", result["reasonCodes"])

    def test_signatures_bind_the_approved_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            authorization = self.authorization()
            trusted_signers = self.sign_authorization(authorization, directory)
            self.assertTrue(
                authorization_check(authorization, self.policy, trusted_signers)[
                    "passed"
                ]
            )
            authorization["approvedFields"].append("chatText")
            self.assertFalse(
                authorization_check(authorization, self.policy, trusted_signers)[
                    "passed"
                ]
            )

    def test_owner_signing_command_creates_verifiable_approvals(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            authorization = self.authorization()
            authorization["approvals"] = {"M5": None, "M6": None}
            authorization_path = directory / "authorization.json"
            authorization_path.write_text(json.dumps(authorization), encoding="utf-8")
            signer_lines = []
            for owner in self.policy["requiredApprovals"]:
                private_key = directory / f"{owner}.key"
                subprocess.run(
                    [
                        "ssh-keygen",
                        "-q",
                        "-t",
                        "ed25519",
                        "-N",
                        "",
                        "-f",
                        str(private_key),
                    ],
                    check=True,
                    capture_output=True,
                )
                public_key = (
                    private_key.with_suffix(".key.pub")
                    .read_text(encoding="utf-8")
                    .split()
                )
                signer_lines.append(f"{owner} {public_key[0]} {public_key[1]}")
                sign_approval(
                    authorization_path,
                    owner,
                    private_key,
                    f"https://github.com/Huang0283/CampusLoop/issues/{129 + len(signer_lines)}",
                )
            trusted_signers = directory / "allowed_signers"
            trusted_signers.write_text("\n".join(signer_lines) + "\n", encoding="utf-8")
            signed = json.loads(authorization_path.read_text(encoding="utf-8"))
            self.assertTrue(
                authorization_check(signed, self.policy, trusted_signers)["passed"]
            )

    def test_future_approval_timestamps_are_rejected(self):
        authorization = self.authorization()
        authorization["approvals"]["M5"]["approvedAt"] = (
            datetime.now(timezone.utc) + timedelta(days=1)
        ).isoformat()
        with tempfile.TemporaryDirectory() as directory:
            trusted_signers = self.sign_authorization(authorization, directory)
            result = authorization_check(authorization, self.policy, trusted_signers)
            self.assertIn("approval-M5-timestamp", result["reasonCodes"])

    def test_refund_dispute_invalidation_and_one_sided_completion_are_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            authorization = self.authorization()
            trusted_signers = self.sign_authorization(authorization, directory)
            rows = self.ready_rows()
            rows[0]["refundStatus"] = "REQUESTED"
            rows[1]["disputeStatus"] = "RESOLVED"
            rows[2]["invalidated"] = True
            rows[3]["buyerConfirmedComplete"] = False
            _, report = build_snapshot(
                rows, authorization, self.policy, b"x" * 32, trusted_signers
            )
            self.assertEqual("NO_GO", report["decision"])
            self.assertEqual(196, report["counts"]["eligibleL3"])
            self.assertEqual(1, report["rejectionReasons"]["REFUND_HISTORY_PRESENT"])
            self.assertEqual(1, report["rejectionReasons"]["DISPUTE_HISTORY_PRESENT"])
            self.assertEqual(1, report["rejectionReasons"]["ORDER_INVALIDATED"])
            self.assertEqual(
                1, report["rejectionReasons"]["BILATERAL_COMPLETION_MISSING"]
            )

    def test_all_required_categories_and_total_count_are_enforced(self):
        with tempfile.TemporaryDirectory() as directory:
            authorization = self.authorization()
            trusted_signers = self.sign_authorization(authorization, directory)
            samples, report = build_snapshot(
                self.ready_rows(),
                authorization,
                self.policy,
                b"x" * 32,
                trusted_signers,
            )
            self.assertEqual("READY_TO_FREEZE", report["decision"])
            self.assertEqual(200, len(samples))
            self.assertFalse(report["privacy"]["rawOrderReferenceRetained"])
            self.assertTrue(
                all(row["sampleId"].startswith("m8-l3-") for row in samples)
            )
            self.assertTrue(
                all(row["expectedStatus"] == "LOW_CONFIDENCE" for row in samples)
            )
            one_category = [self.row(number, "digital") for number in range(200)]
            _, failed = build_snapshot(
                one_category, authorization, self.policy, b"x" * 32, trusted_signers
            )
            self.assertEqual("NO_GO", failed["decision"])
            self.assertEqual(
                set(self.policy["requiredCategorySlices"]) - {"digital"},
                set(failed["missingCategorySamples"]),
            )

    def test_identity_or_unknown_fields_are_rejected_not_silently_dropped(self):
        for field in ("buyerId", "email", "unexpected"):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as directory:
                authorization = self.authorization()
                trusted_signers = self.sign_authorization(authorization, directory)
                row = self.row()
                row[field] = "private"
                with self.assertRaises(DataError):
                    build_snapshot(
                        [row], authorization, self.policy, b"x" * 32, trusted_signers
                    )

    def test_malformed_prices_and_defect_tags_fail_closed(self):
        for change in ({"amountFen": None}, {"amountFen": True}, {"defectTags": [{}]}):
            with self.subTest(change=change):
                row = self.row()
                row.update(change)
                with tempfile.TemporaryDirectory() as directory:
                    authorization = self.authorization()
                    trusted_signers = self.sign_authorization(authorization, directory)
                    with self.assertRaises(DataError):
                        build_snapshot(
                            [row],
                            authorization,
                            self.policy,
                            b"x" * 32,
                            trusted_signers,
                        )

    def test_key_is_required_and_changes_pseudonym(self):
        with self.assertRaises(DataError):
            build_snapshot([self.row()], self.authorization(), self.policy, b"short")
        with tempfile.TemporaryDirectory() as directory:
            authorization = self.authorization()
            trusted_signers = self.sign_authorization(authorization, directory)
            first, _ = build_snapshot(
                [self.row()], authorization, self.policy, b"a" * 32, trusted_signers
            )
            second, _ = build_snapshot(
                [self.row()], authorization, self.policy, b"b" * 32, trusted_signers
            )
            self.assertNotEqual(first[0]["sampleId"], second[0]["sampleId"])

    def test_raw_export_inside_repository_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=POLICY.parents[2]) as directory:
            input_path = Path(directory) / "raw.jsonl"
            input_path.write_text(json.dumps(self.row()) + "\n", encoding="utf-8")
            auth_path = Path(directory) / "auth.json"
            auth_path.write_text(json.dumps(self.authorization()), encoding="utf-8")
            with self.assertRaises(DataError):
                write_snapshot(
                    input_path, Path(directory) / "output", auth_path, b"x" * 32
                )

    def test_private_snapshot_output_must_be_outside_repository(self):
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory)
            input_path = outside / "raw.jsonl"
            input_path.write_text(json.dumps(self.row()) + "\n", encoding="utf-8")
            auth_path = outside / "auth.json"
            auth_path.write_text(json.dumps(self.authorization()), encoding="utf-8")
            with self.assertRaisesRegex(
                DataError, "output directory must stay outside"
            ):
                write_snapshot(
                    input_path,
                    POLICY.parents[2] / "output" / "unsafe-m8-snapshot",
                    auth_path,
                    b"x" * 32,
                )

    def test_generated_snapshot_is_consumed_by_readiness_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory)
            with tempfile.TemporaryDirectory(dir=outside) as signer_directory:
                authorization = self.authorization()
                trusted_signers = self.sign_authorization(
                    authorization, signer_directory
                )
                authorization_path = outside / "authorization.json"
                authorization_path.write_text(
                    json.dumps(authorization), encoding="utf-8"
                )
                input_path = outside / "orders.jsonl"
                input_path.write_text(
                    "".join(json.dumps(row) + "\n" for row in self.ready_rows()),
                    encoding="utf-8",
                )
                snapshot_dir = outside / "snapshot"
                write_snapshot(
                    input_path,
                    snapshot_dir,
                    authorization_path,
                    b"x" * 32,
                    trusted_signers,
                )
                gates = json.loads(MODEL_GATES.read_text(encoding="utf-8"))
                next(
                    row
                    for row in gates["capabilities"]
                    if row["capability"] == "price-model"
                )["datasetFrozen"] = True
                gates_path = outside / "gates.json"
                gates_path.write_text(json.dumps(gates), encoding="utf-8")
                result = inspect_readiness(
                    dataset_dir=snapshot_dir,
                    model_gates_path=gates_path,
                    authorization_path=authorization_path,
                    authorization_signers_path=trusted_signers,
                )
                self.assertEqual("GO_FOR_CANDIDATE_TRAINING", result["decision"])
                self.assertEqual(200, result["counts"]["eligibleL3"])
                self.assertFalse(result["candidateServingAllowed"])
                samples = snapshot_dir / "price-l3-snapshot.jsonl"
                samples.write_text(
                    samples.read_text(encoding="utf-8") + "\n", encoding="utf-8"
                )
                self.assertIn(
                    "manifest-input-hashes",
                    inspect_readiness(
                        dataset_dir=snapshot_dir,
                        model_gates_path=gates_path,
                        authorization_path=authorization_path,
                        authorization_signers_path=trusted_signers,
                    )["reasonCodes"],
                )


if __name__ == "__main__":
    unittest.main()
