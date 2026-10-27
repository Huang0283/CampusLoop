"""Gate regression fixtures are synthetic, never training or acceptance data."""

import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from services.m8_phase4.readiness import (
    inspect,
    ROOT,
    POLICY,
    MODEL_GATES,
    SOURCES,
    SAMPLES,
)
from services.m8_phase4.transaction_dataset import REQUIRED_EXPORT_FIELDS
from services.m8_phase4.tests.test_support import sign_authorization


class ReadinessInputTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads(POLICY.read_text(encoding="utf-8"))
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        directory = Path(self.temporary.name)
        self.samples, self.sources, self.manifest, self.gates, self.authorization = [
            directory / name
            for name in (
                "price-samples.jsonl",
                "source-register.json",
                "manifest.json",
                "model-gates.json",
                "authorization.json",
            )
        ]
        self.rows = []
        original = json.loads(SAMPLES.read_text(encoding="utf-8").splitlines()[0])
        for number in range(200):
            self.rows.append(
                {
                    **original,
                    "sampleId": f"m8-gate-test-{number}",
                    "sourceId": "PDS-02",
                    "sourceType": "completed_order",
                    "labelLevel": "L3_COMPLETED_TRANSACTION",
                    "transactionPriceFen": 500000,
                    "completedAt": "2026-09-02T08:00:00Z",
                    "category": (
                        "digital",
                        "books",
                        "household",
                        "clothing",
                        "sports",
                        "other",
                    )[number % 6],
                }
            )
        register = json.loads(SOURCES.read_text(encoding="utf-8"))
        source = next(row for row in register["sources"] if row["sourceId"] == "PDS-02")
        source.update(
            licenseStatus="approved",
            licenseEvidence="SYNTHETIC TEST FIXTURE ONLY",
            approvals={"M5": "fixture-only", "M6": "fixture-only"},
        )
        self.sources.write_text(json.dumps(register), encoding="utf-8")
        gates = json.loads(MODEL_GATES.read_text(encoding="utf-8"))
        next(
            row for row in gates["capabilities"] if row["capability"] == "price-model"
        )["datasetFrozen"] = True
        self.gates.write_text(json.dumps(gates), encoding="utf-8")
        self.authorization.write_text(
            json.dumps(
                {
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
            ),
            encoding="utf-8",
        )
        authorization = json.loads(self.authorization.read_text(encoding="utf-8"))
        self.trusted_signers = sign_authorization(authorization, self.policy, directory)
        self.authorization.write_text(json.dumps(authorization), encoding="utf-8")
        self.write_inputs()

    def write_inputs(self):
        self.samples.write_text(
            "\n".join(json.dumps(row) for row in self.rows), encoding="utf-8"
        )
        manifest = {
            "datasetVersion": "m8-price-l3-test-v1",
            "schemaVersion": "m8-price-raw-v1",
            "recordCount": len(self.rows),
            "eligibleL3Count": sum(
                row["labelLevel"] == "L3_COMPLETED_TRANSACTION" for row in self.rows
            ),
            "inputs": {
                path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                for path in (self.samples, self.sources)
            },
        }
        self.manifest.write_text(json.dumps(manifest), encoding="utf-8")

    def inspect(self):
        return inspect(
            POLICY,
            self.manifest,
            self.sources,
            self.samples,
            self.gates,
            self.authorization,
            self.trusted_signers,
        )

    def test_canonical_phase2_l3_rows_are_counted_but_never_auto_served(self):
        result = self.inspect()
        self.assertEqual(result["decision"], "GO_FOR_CANDIDATE_TRAINING")
        self.assertEqual(result["counts"]["eligibleL3"], 200)
        self.assertFalse(result["candidateServingAllowed"])

    def test_duplicate_invalid_and_wrong_source_rows_cannot_open_gate(self):
        for changes in (
            {"sampleId": self.rows[0]["sampleId"]},
            {"transactionPriceFen": None},
            {"completedAt": None},
            {"schemaVersion": "wrong"},
            {"sourceId": "PDS-03", "sourceType": "synthetic"},
        ):
            with self.subTest(changes=changes):
                original = copy.deepcopy(self.rows)
                self.rows[1].update(changes)
                self.write_inputs()
                self.assertEqual(self.inspect()["decision"], "NO_GO")
                self.rows = original

    def test_changed_input_without_manifest_update_cannot_open_gate(self):
        self.samples.write_text(
            self.samples.read_text(encoding="utf-8") + "\n", encoding="utf-8"
        )
        result = self.inspect()
        self.assertEqual(result["decision"], "NO_GO")
        self.assertIn("manifest-input-hashes", result["reasonCodes"])

    def test_policy_is_part_of_the_recorded_input_hashes(self):
        self.assertIn(
            POLICY.relative_to(ROOT).as_posix(), self.inspect()["inputHashes"]
        )
