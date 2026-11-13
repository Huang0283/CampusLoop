"""Guard and credential replay checks; no Docker/database writes."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import audit_env


class AuditConfigTests(unittest.TestCase):
    def test_explicit_upgrade_preserves_credentials_and_archives_old_manifest(self):
        with (
            tempfile.TemporaryDirectory() as temporary,
            patch.object(audit_env, "ROOT", Path(temporary)),
            patch.object(audit_env, "source_sha", return_value="a" * 40),
        ):
            folder, config = audit_env.initialize("business", "run1")
            audit_env.private_json(folder / "connection.json", {"softwareSha": "a" * 40})
            manifest = folder / "data-state/t1-business-run1.json"
            original = {
                "environment": {
                    "softwareSha": "a" * 40,
                    "containerId": "old",
                    "database": config["AUDIT_DATABASE"],
                },
                "accounts": {"A": {"id": 7, "password": "private-test-password"}},
                "products": {"P001": {"id": 5}},
            }
            audit_env.private_json(manifest, original)
            credentials = (folder / "admins.json").read_bytes()
            with (
                patch.object(audit_env, "source_sha", return_value="b" * 40),
                patch.object(audit_env, "inspect_api", return_value="audit-api"),
                patch.object(audit_env, "check_configuration"),
                patch.object(audit_env, "compose", return_value=SimpleNamespace(stdout="audit-db")),
                patch.object(audit_env, "bootstrap"),
                patch.object(audit_env, "start_catalog"),
                patch.object(audit_env.subprocess, "run"),
                patch.object(audit_env.subprocess, "check_output", return_value=b'[{"Id":"new"}]'),
            ):
                audit_env.upgrade(folder, config)
            current = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(current["accounts"], original["accounts"])
            self.assertEqual(current["products"], original["products"])
            self.assertEqual(current["environment"]["softwareSha"], "b" * 40)
            self.assertEqual((folder / "admins.json").read_bytes(), credentials)
            archived = next((folder / "versions").glob("*/t1-business-run1.json"))
            self.assertEqual(json.loads(archived.read_text(encoding="utf-8")), original)

    def test_build_failure_never_restarts_or_relabels_existing_environment(self):
        import subprocess

        with (
            tempfile.TemporaryDirectory() as temporary,
            patch.object(audit_env, "ROOT", Path(temporary)),
            patch.object(audit_env, "source_sha", return_value="a" * 40),
        ):
            folder, config = audit_env.initialize("business", "run1")
            saved = (folder / "private-config.json").read_bytes()
            with (
                patch.object(audit_env, "source_sha", return_value="b" * 40),
                patch.object(audit_env, "inspect_api", return_value="audit-api"),
                patch.object(audit_env, "check_configuration"),
                patch.object(
                    audit_env, "compose", side_effect=subprocess.CalledProcessError(1, "build")
                ) as compose,
                self.assertRaises(subprocess.CalledProcessError),
            ):
                audit_env.upgrade(folder, config)
            self.assertEqual(compose.call_count, 1)
            self.assertEqual((folder / "private-config.json").read_bytes(), saved)

    def test_namespace_replay_preserves_secrets_and_rejects_changed_source(self):
        with (
            tempfile.TemporaryDirectory() as temporary,
            patch.object(audit_env, "ROOT", Path(temporary)),
            patch.object(audit_env, "source_sha", return_value="a" * 40),
        ):
            folder, original = audit_env.initialize("business", "run1")
            credentials = (folder / "admins.json").read_bytes()
            self.assertEqual(audit_env.initialize("business", "run1"), (folder, original))
            self.assertEqual((folder / "admins.json").read_bytes(), credentials)
            users = json.loads(credentials)
            self.assertNotEqual(users["R"]["email"], users["S"]["email"])
            self.assertNotEqual(users["R"]["password"], users["S"]["password"])
            other, config = audit_env.initialize("permission", "run1")
            self.assertNotEqual(folder, other)
            self.assertNotEqual(config["AUDIT_DATABASE"], original["AUDIT_DATABASE"])
            with (
                patch.object(audit_env, "source_sha", return_value="b" * 40),
            ):
                self.assertEqual(
                    audit_env.initialize("business", "run1", existing_only=True),
                    (folder, original),
                )
                with self.assertRaises(ValueError):
                    audit_env.initialize("business", "run1")
                with self.assertRaises(ValueError):
                    audit_env.initialize("business", "missing", existing_only=True)

    def test_run_id_cannot_escape_private_directory(self):
        for value in ("../daily", "RUN1", "", "a" * 21, "run/1"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                audit_env.initialize("business", value)


class SeedGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = audit_env.ROOT / "backend/scripts/seed_audit_admins.py"
        spec = importlib.util.spec_from_file_location("seed_audit_admins", path)
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def setUp(self):
        self.project = "campusloop-business-run1-audit"
        self.settings = dict(
            app_env="test",
            database_url="postgresql+psycopg://user:secret@db:5432/campusloop_audit_business_run1",
            redis_url="redis://redis:6379/15",
            minio_endpoint="minio:9000",
            minio_public_bucket=self.project + "-public",
            minio_private_bucket=self.project + "-private",
        )
        self.credentials = {
            alias: dict(
                email=f"t1-business-run1-{alias.lower()}@example.invalid",
                password="random-audit-only-credential",
            )
            for alias in ("R", "S")
        }

    def validate(self):
        self.module.validate_target(
            SimpleNamespace(**self.settings),
            "business",
            "run1",
            self.project,
            self.credentials,
        )

    def test_valid_audit_target(self):
        self.validate()

    def test_daily_and_mismatched_targets_are_rejected(self):
        for key, value in [
            ("app_env", "dev"),
            ("database_url", "postgresql://user:secret@db:5432/campusloop"),
            ("redis_url", "redis://redis:6379/0"),
            ("minio_private_bucket", "campusloop-private"),
            ("minio_endpoint", "daily-minio:9000"),
        ]:
            with (
                self.subTest(key=key),
                patch.dict(self.settings, {key: value}),
                self.assertRaises(ValueError),
            ):
                self.validate()

    def test_other_namespace_or_missing_admin_is_rejected(self):
        self.credentials["S"]["email"] = "t1-permission-run1-s@example.invalid"
        with self.assertRaises(ValueError):
            self.validate()
        del self.credentials["S"]
        with self.assertRaises(ValueError):
            self.validate()


if __name__ == "__main__":
    unittest.main()
