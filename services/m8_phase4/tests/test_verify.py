import json
from pathlib import Path
from subprocess import CompletedProcess
import tempfile
import unittest
from unittest.mock import patch

from services.m8_phase4.verify import verify


class VerificationTests(unittest.TestCase):
    def test_regression_failure_saves_logs_and_does_not_claim_success(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            with patch("services.m8_phase4.verify.subprocess.run") as run:
                run.side_effect = [
                    CompletedProcess([], 0, "", "Ran 14 tests\nOK\n"),
                    CompletedProcess([], 1, "", "Ran 31 tests\nFAILED (errors=4)\n"),
                    CompletedProcess([], 0, "", "Ran 20 tests\nOK\n"),
                ]
                with self.assertRaisesRegex(RuntimeError, "phase3"):
                    verify(target, "test-source-commit")
            self.assertEqual(3, run.call_count)
            record = json.loads((target / "failed-run.json").read_text())
            self.assertEqual(["phase3"], record["failed"])
            self.assertIn("FAILED", (target / "phase3-tests.txt").read_text())
            self.assertFalse((target / "run-record.json").exists())

    def test_empty_test_suite_cannot_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("services.m8_phase4.verify.subprocess.run") as run:
                run.return_value = CompletedProcess([], 0, "", "Ran 0 tests\nOK\n")
                with self.assertRaises(RuntimeError):
                    verify(Path(directory), "test-source-commit")

    def test_existing_evidence_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            evidence = target / "keep.txt"
            evidence.write_text("original")
            with self.assertRaisesRegex(ValueError, "must be empty"):
                verify(target, "test-source-commit")
            self.assertEqual("original", evidence.read_text())
