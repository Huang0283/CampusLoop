"""CLI recovery uses real subprocesses and explicit synthetic facts."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from services.m7_baseline.engine import ROOT, rank
from services.m7_baseline.tests import test_engine as fixtures


class QueryRecoveryTests(unittest.TestCase):
    def test_unopenable_or_corrupt_index_recovers_to_the_same_filtered_baseline(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        expected = rank([fixture.product], fixture.request, fixture.dictionary)
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            products, request, dictionary = [directory / name for name in ("products.jsonl", "request.json", "dictionary.json")]
            for path, value in ((products, fixture.product), (request, fixture.request), (dictionary, fixture.dictionary)):
                path.write_text(json.dumps(value), encoding="utf-8")
            corrupt = directory / "corrupt.sqlite"
            corrupt.write_bytes(b"not a SQLite database")
            for index in (directory / "missing-parent" / "index.sqlite", corrupt):
                with self.subTest(index=index.name):
                    run = subprocess.run(
                        [sys.executable, "-m", "services.m7_semantic", "query", "--model-dir", str(directory / "missing-model"),
                         "--index", str(index), "--products", str(products), "--request", str(request), "--dictionary", str(dictionary)],
                        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", timeout=20,
                        env=dict(os.environ, PYTHONIOENCODING="utf-8"),
                    )
                    self.assertEqual(run.returncode, 0, run.stderr)
                    result = json.loads(run.stdout)
                    self.assertEqual(result["items"], expected["items"])
                    self.assertTrue(result["metadata"]["degraded"])
                    self.assertEqual(result["metadata"]["fallbackReason"], "INDEX_UNAVAILABLE")
