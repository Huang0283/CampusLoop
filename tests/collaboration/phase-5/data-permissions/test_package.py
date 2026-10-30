"""Package integrity and local audit boundaries, with no network writes."""

import copy
import json
import shutil
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

import runtime
import verify_data


class PackageTests(unittest.TestCase):
    def test_all_fixture_families_validate(self):
        report = verify_data.verify_static()
        self.assertEqual(report["mockSchemas"], 20)
        self.assertEqual(report["schemaRejected"], 22)
        self.assertEqual(report["permissionCasesNotExecuted"], 36)

    def corrupt(self, filename, change):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "fixtures"
            shutil.copytree(
                runtime.BASE,
                target,
                ignore=shutil.ignore_patterns("__pycache__", "generated"),
            )
            path = target / filename
            change(path)
            with self.assertRaises((ValueError, FileNotFoundError)):
                verify_data.verify_static(target)

    def test_missing_image_fails(self):
        self.corrupt("media/M01.jpg", lambda p: p.unlink())

    def test_changed_image_fails(self):
        self.corrupt("media/M01.jpg", lambda p: p.write_bytes(p.read_bytes() + b"changed"))

    def test_invalid_category_fails(self):
        def change(path):
            data = json.loads(path.read_text(encoding="utf-8"))
            data[0]["category"] = "OTHER"
            path.write_text(json.dumps(data), encoding="utf-8")

        self.corrupt("products.json", change)

    def test_omitted_fixture_family_fails(self):
        self.corrupt("price-checks.json", lambda p: p.write_text("[]", encoding="utf-8"))


class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.args = Namespace(
            api="http://127.0.0.1:18014",
            container="audit",
            run_id="unit1",
            namespace="permission",
            state_dir=Path(self.temp.name) / ".codex-tmp",
        )
        self.info = {
            "Id": "container-id",
            "State": {"Running": True},
            "Config": {
                "Labels": {"campusloop.audit.software-sha": "a" * 40},
                "Env": [
                    "APP_ENV=test",
                    "DATABASE_URL=postgresql://audit:5432/campusloop_audit_test",
                    "REDIS_URL=redis://audit/14",
                    "MINIO_PUBLIC_BUCKET=test-audit-public",
                    "MINIO_PRIVATE_BUCKET=test-audit-private",
                    "S3_PUBLIC_BASE_URL=http://audit/test-audit-public",
                ],
            },
            "NetworkSettings": {
                "Ports": {"8000/tcp": [{"HostIp": "127.0.0.1", "HostPort": "18014"}]}
            },
        }

    def inspect(self, info):
        return patch("runtime.subprocess.check_output", return_value=json.dumps([info]).encode())

    def test_daily_api_refused_before_docker_or_http(self):
        self.args.api = "http://127.0.0.1:8001"
        with patch("runtime.subprocess.check_output") as docker:
            with self.assertRaises(ValueError):
                runtime.guard(self.args)
            docker.assert_not_called()

    def test_daily_database_or_redis_or_bucket_refused(self):
        for original, replacement in [
            (
                "DATABASE_URL=postgresql://audit:5432/campusloop_audit_test",
                "DATABASE_URL=postgresql://daily/campusloop",
            ),
            ("REDIS_URL=redis://audit/14", "REDIS_URL=redis://audit/0"),
            (
                "MINIO_PUBLIC_BUCKET=test-audit-public",
                "MINIO_PUBLIC_BUCKET=campusloop-public",
            ),
        ]:
            info = copy.deepcopy(self.info)
            info["Config"]["Env"] = [
                replacement if v == original else v for v in info["Config"]["Env"]
            ]
            with self.inspect(info), self.assertRaises(ValueError):
                runtime.guard(self.args)

    def test_manifest_cannot_be_reused_for_different_environment(self):
        with self.inspect(self.info):
            path, state, _ = runtime.open_state(self.args, create=True)
            state["environment"]["containerId"] = "another-container"
            runtime.save(path, state)
            with self.assertRaises(ValueError):
                runtime.open_state(self.args)

    def test_reset_run_cannot_be_silently_reseeded(self):
        with self.inspect(self.info):
            path, state, _ = runtime.open_state(self.args, create=True)
            state["lifecycle"] = "reset-partial"
            runtime.save(path, state)
            with self.assertRaises(ValueError):
                runtime.open_state(self.args, create=True)


if __name__ == "__main__":
    unittest.main()
