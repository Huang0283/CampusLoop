"""Build an auditable candidate source bundle; never infer final approval."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

REQUIRED_GATES = (
    "group_prs_merged",
    "integration_ci_passed",
    "same_source_tested",
    "no_open_p0_p1",
    "clean_install_passed",
    "recovery_passed",
    "two_rehearsals_recorded",
    "recorded_video",
    "course_materials_complete",
    "licenses_reviewed",
    "m1_scope_accepted",
    "m10_quality_accepted",
    "main_stage_pr_merged",
    "immutable_tag_verified",
)
EXCLUDED_PARTS = {
    ".git",
    ".codex-tmp",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "output",
    ".pytest_cache",
    ".ruff_cache",
    ".cache",
}
EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".dump",
    ".bak",
    ".sqlite",
    ".sqlite3",
    ".db",
    ".pem",
    ".key",
    ".safetensors",
    ".onnx",
    ".pt",
    ".pth",
    ".bin",
}


def allowed_source(name: str) -> bool:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or set(path.parts) & EXCLUDED_PARTS:
        return False
    if path.name.startswith(".env") and path.name != ".env.example":
        return False
    return path.suffix.lower() not in EXCLUDED_SUFFIXES


def secret_findings(name: str, body: bytes) -> list[str]:
    patterns = [
        rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        rb"gh[pousr]_[A-Za-z0-9]{36,}",
        rb"github_pat_[A-Za-z0-9_]{50,}",
        rb"AKIA[0-9A-Z]{16}",
    ]
    return [name + ": secret-shaped content" for pattern in patterns if re.search(pattern, body)]


def check_evidence(root: Path, status: dict) -> list[str]:
    failures = []
    root = root.resolve()
    for row in status.get("evidence", []):
        path = (root / row["path"]).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            failures.append("missing/unsafe evidence: " + row["path"])
        elif hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
            failures.append("evidence changed: " + row["path"])
    if not status.get("evidence"):
        failures.append("no evidence manifest")
    return failures


def check_gates(status: dict) -> list[str]:
    return [name for name in REQUIRED_GATES if status.get("gates", {}).get(name) is not True]


def git(root: Path, *args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(root), *args])


def package(source: Path, revision: str, supplemental: Path, output: Path) -> dict:
    if output.exists():
        raise ValueError("output already exists; use a new candidate filename")
    commit = git(source, "rev-parse", "--verify", revision + "^{commit}").decode().strip()
    entries = {}
    skipped = []
    for row in git(source, "ls-tree", "-r", "-z", commit).split(b"\0"):
        if not row:
            continue
        meta, encoded = row.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        name = encoded.decode("utf-8")
        if kind != "blob" or mode not in {"100644", "100755"} or not allowed_source(name):
            skipped.append(name)
            continue
        entries["source/" + name] = git(source, "cat-file", "blob", oid)
    for path in sorted(supplemental.rglob("*")):
        if path.is_file() and not path.is_symlink():
            name = path.relative_to(supplemental).as_posix()
            if not allowed_source(name):
                skipped.append("quality/" + name)
                continue
            entries["quality/" + name] = path.read_bytes()
    findings = [
        finding for name, body in entries.items() for finding in secret_findings(name, body)
    ]
    if findings:
        raise ValueError("\n".join(findings))
    manifest = {
        "kind": "CANDIDATE_NOT_FINAL",
        "sourceCommit": commit,
        "excluded": skipped,
        "files": [
            {"path": name, "size": len(body), "sha256": hashlib.sha256(body).hexdigest()}
            for name, body in sorted(entries.items())
        ],
        "scope": "Git source plus quality evidence; no real database, video or model weights implied",
    }
    entries["MANIFEST.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, body in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, body)
    with zipfile.ZipFile(output) as archive:
        for row in manifest["files"]:
            if hashlib.sha256(archive.read(row["path"])).hexdigest() != row["sha256"]:
                raise ValueError("archive readback mismatch: " + row["path"])
    return {
        "path": str(output),
        "sourceCommit": commit,
        "kind": manifest["kind"],
        "files": len(manifest["files"]),
        "bytes": output.stat().st_size,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "readback": "PASS",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    gate = sub.add_parser("check")
    gate.add_argument("--root", type=Path, required=True)
    gate.add_argument("--status", type=Path, required=True)
    pack = sub.add_parser("package")
    pack.add_argument("--source", type=Path, required=True)
    pack.add_argument("--revision", required=True)
    pack.add_argument("--quality", type=Path, required=True)
    pack.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.action == "check":
        status = json.loads(args.status.read_text(encoding="utf-8"))
        failures = check_evidence(args.root, status)
        gates = check_gates(status)
        print(
            json.dumps(
                {
                    "release": "BLOCKED" if failures or gates else "PASS",
                    "evidenceFailures": failures,
                    "unmetGates": gates,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 1 if failures or gates else 0
    print(
        json.dumps(
            package(
                args.source.resolve(), args.revision, args.quality.resolve(), args.output.resolve()
            ),
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
