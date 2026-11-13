"""Package integrity and local audit boundaries, with no network writes."""

import copy
import csv
import json
import shutil
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest.mock import patch

import runtime
import setup_data
import verify_data
from admin_fixtures import products_for_run, verify_execution_log


class PackageTests(unittest.TestCase):
    def test_old_material_checkout_cannot_silently_validate_current_search(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch("verify_data.SOFTWARE_ROOT", Path(folder)):
                with self.assertRaisesRegex(ValueError, "CAMPUSLOOP_FIXTURE_SOFTWARE_ROOT"):
                    verify_data.verify_static()

    def test_all_fixture_families_validate(self):
        report = verify_data.verify_static()
        self.assertEqual(report["mockSchemas"], 20)
        self.assertEqual(report["schemaRejected"], 22)
        self.assertEqual(report["permissionCasesDefined"], 48)
        self.assertEqual(report["permissionCasesNotExecutedByThisCheck"], 48)
        self.assertEqual(report["additionalInputs"]["admin-list-checks"], 8)

    def test_optional_search_data_does_not_replace_foundation(self):
        foundation = products_for_run()
        extended = products_for_run(admin_search=True)
        self.assertEqual(len(foundation), 60)
        self.assertEqual(extended[:60], foundation)
        self.assertEqual(len(extended), 70)

    def test_existing_run_cannot_switch_optional_dataset(self):
        for old, new in ((False, True), (True, False)):
            state = {"products": {"P001": {"id": 1}}, "adminSearch": old}
            with patch("setup_data.open_state", return_value=(Path("unused"), state, None)):
                with patch("setup_data.save") as save:
                    with self.assertRaisesRegex(ValueError, "use a new run ID"):
                        setup_data.setup(Namespace(admin_search=new))
                    save.assert_not_called()

    def test_new_fixture_families_are_required(self):
        for name in (
            "admin-search-products",
            "search-checks-admin-v2",
            "admin-list-checks",
            "admin-scenario-inputs",
        ):
            with self.subTest(name=name):
                self.corrupt(name + ".json", lambda p: p.unlink())

    def test_search_and_governance_corruption_is_rejected(self):
        for name, index, field, value in (
            ("search-checks-admin-v2", 1, "expectedInclude", ["P010", "P016"]),
            ("admin-search-products", 0, "fixtureId", "P001"),
            ("admin-scenario-inputs", 4, "expectedStatus", "BANNED"),
            ("admin-scenario-inputs", 6, "expectedStatus", "HIDDEN_BY_ADMIN"),
            ("admin-scenario-inputs", 7, "dependsOn", "missing"),
            ("admin-scenario-inputs", 3, "targetMessageAuthorAlias", "B"),
            ("admin-list-checks", 0, "endpoint", "/products"),
            ("admin-list-checks", 0, "queryParameter", "client"),
            ("search-checks-admin-v2", 2, "expectedInclude", ["AP001", "AP009"]),
            ("search-checks-admin-v2", 8, "expectedExclude", ["AP009"]),
            ("search-checks-admin-v2", 2, "endpoint", "/products"),
            ("search-checks-admin-v2", 9, "endpoint", "/search"),
        ):

            def change(path, index=index, field=field, value=value):
                data = json.loads(path.read_text(encoding="utf-8"))
                data[index][field] = value
                path.write_text(json.dumps(data), encoding="utf-8")

            with self.subTest(name=name, field=field):
                self.corrupt(name + ".json", change)

    def test_execution_log_missing_column_is_rejected(self):
        path = (
            runtime.ROOT / "docs/collaboration/phase-5/testing/data-permissions/execution-log.csv"
        )
        with path.open(encoding="utf-8", newline="") as stream:
            rows = list(csv.reader(stream))
        rows[-1].pop()
        with tempfile.TemporaryDirectory() as folder:
            broken = Path(folder) / "execution-log.csv"
            with broken.open("w", encoding="utf-8", newline="") as stream:
                csv.writer(stream).writerows(rows)
            with self.assertRaisesRegex(ValueError, "ten named columns"):
                verify_execution_log(broken)

    def execution_rows(self):
        path = (
            runtime.ROOT / "docs/collaboration/phase-5/testing/data-permissions/execution-log.csv"
        )
        with path.open(encoding="utf-8-sig", newline="") as stream:
            return list(csv.reader(stream))

    def verify_rows(self, rows):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "execution-log.csv"
            with path.open("w", encoding="utf-8", newline="") as stream:
                csv.writer(stream).writerows(rows)
            verify_execution_log(path)

    def test_execution_log_accepts_appended_retests_without_replacing_history(self):
        rows = self.execution_rows()
        rows.append(rows[1].copy())
        rows[-1][6] = "失败"
        self.verify_rows(rows)

    def test_execution_log_still_requires_every_case_and_rejects_unknown_ids(self):
        rows = self.execution_rows()
        missing = [row for row in rows if row[0] != "T1-C12"]
        unknown = [row.copy() for row in rows]
        unknown[-1][0] = "T1-C49"
        for invalid in (missing, unknown):
            with self.subTest(invalid=invalid[-1][0]):
                with self.assertRaisesRegex(ValueError, "cover C01-C48"):
                    self.verify_rows(invalid)

    def test_execution_log_rejects_timestamp_on_unexecuted_case(self):
        for case in ("T1-C12", "T1-C44"):
            rows = self.execution_rows()
            row = next(row for row in rows[1:] if row[0] == case)
            row[6:8] = ["未执行", "2026-11-12T01:00:00Z"]
            with self.subTest(case=case):
                with self.assertRaisesRegex(ValueError, "cannot have execution timestamps"):
                    self.verify_rows(rows)

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
