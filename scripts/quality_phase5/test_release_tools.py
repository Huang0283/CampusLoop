import hashlib
import importlib.util
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "release_tools", Path(__file__).with_name("release_tools.py")
)
tools = importlib.util.module_from_spec(SPEC)


class ReleaseToolsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        SPEC.loader.exec_module(tools)

    def test_missing_or_tampered_evidence_blocks_release(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record = {
                "evidence": [{"path": "result.txt", "sha256": hashlib.sha256(b"pass").hexdigest()}]
            }
            self.assertTrue(tools.check_evidence(root, record))
            (root / "result.txt").write_bytes(b"pass")
            self.assertEqual(tools.check_evidence(root, record), [])
            (root / "result.txt").write_bytes(b"fail")
            self.assertTrue(tools.check_evidence(root, record))

    def test_evidence_cannot_escape_root(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertTrue(
                tools.check_evidence(
                    Path(directory), {"evidence": [{"path": "../secret", "sha256": "0" * 64}]}
                )
            )

    def test_final_requires_all_real_gates(self):
        status = {"gates": {name: False for name in tools.REQUIRED_GATES}}
        self.assertEqual(len(tools.check_gates(status)), len(tools.REQUIRED_GATES))
        status["gates"] = {name: True for name in tools.REQUIRED_GATES}
        self.assertEqual(tools.check_gates(status), [])
        status["gates"]["recorded_video"] = "pending"
        self.assertTrue(tools.check_gates(status))

    def test_secrets_caches_dumps_and_symlinks_are_excluded(self):
        for name in [
            ".env",
            "backend/.env.audit",
            "node_modules/a.js",
            "x/.git/config",
            "x/backup.dump",
            "x/state.sqlite",
            "x/__pycache__/a.pyc",
            "x/token.pem",
            "output/private.json",
            ".codex-tmp/secret.txt",
            "x/pytorch_model.bin",
            "x/weights.safetensors",
        ]:
            self.assertFalse(tools.allowed_source(name), name)
        self.assertTrue(tools.allowed_source("frontend/.env.example"))
        self.assertTrue(tools.allowed_source("docs/evidence/phase-5/result.json"))

    def test_secret_scan_does_not_treat_placeholder_as_live_secret(self):
        self.assertEqual(tools.secret_findings(".env.example", b"AUTH_SIGNING_KEY=\n"), [])
        self.assertTrue(tools.secret_findings("config.py", b"-----BEGIN " + b"PRIVATE KEY-----"))
        self.assertTrue(tools.secret_findings("config.py", b"ghp_" + b"x" * 36))

    def test_real_package_is_deterministic_and_reads_committed_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "repo"
            source.mkdir()
            subprocess.run(["git", "init", "-q", str(source)], check=True)
            (source / "app.py").write_bytes(b"committed code\n")
            (source / ".env").write_bytes(b"private runtime\n")
            subprocess.run(["git", "-C", str(source), "add", "."], check=True)
            subprocess.run(
                [
                    "git",
                    "-C",
                    str(source),
                    "-c",
                    "user.name=fixture",
                    "-c",
                    "user.email=fixture@example.invalid",
                    "commit",
                    "-qm",
                    "fixture",
                ],
                check=True,
            )
            (source / "app.py").write_bytes(b"uncommitted edit\n")
            quality = root / "quality"
            quality.mkdir()
            (quality / "report.md").write_bytes(b"actual evidence\n")
            first = tools.package(source, "HEAD", quality, root / "a.zip")
            second = tools.package(source, "HEAD", quality, root / "b.zip")
            self.assertEqual(first["sha256"], second["sha256"])
            with zipfile.ZipFile(root / "a.zip") as archive:
                self.assertNotIn("source/.env", archive.namelist())
                self.assertEqual(archive.read("source/app.py"), b"committed code\n")
                self.assertEqual(
                    json.loads(archive.read("MANIFEST.json"))["kind"], "CANDIDATE_NOT_FINAL"
                )


if __name__ == "__main__":
    unittest.main()
