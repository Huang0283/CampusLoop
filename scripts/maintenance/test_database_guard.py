"""The maintenance tools must refuse a daily database before writing anything."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class MaintenanceDatabaseGuardTest(unittest.TestCase):
    def test_daily_databases_are_rejected_before_creating_evidence(self):
        for script in ("verify_phase123.py", "verify_m8_backend.py"):
            with self.subTest(script=script), tempfile.TemporaryDirectory() as folder:
                output = Path(folder) / "evidence"
                result = subprocess.run([
                    sys.executable, str(Path(__file__).with_name(script)),
                    "--repo-root", folder, "--output-dir", str(output), "--source-commit", "guard-test",
                ], env={**os.environ, "APP_ENV": "test", "DATABASE_URL": "postgresql+psycopg://test:test@campusloop-ops-db:5432/campusloop_ops", "REDIS_URL": "redis://campusloop-ops-redis:6379/15"}, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(output.exists(), "Rejected daily database must not reach the test/rollback workflow")


if __name__ == "__main__":
    unittest.main()
