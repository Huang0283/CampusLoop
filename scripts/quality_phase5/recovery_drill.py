"""Recover only the dedicated audit database into a new audit database. Never targets daily data."""

import hashlib
import json
import secrets
import subprocess
import time
from pathlib import Path

R = Path(".codex-tmp/runs")
R.mkdir(exist_ok=True, parents=True)
API = "campusloop-mq5-audit-api-1"
DB = "campusloop-mq5-audit-db-1"
TARGET = "campusloop_recovery_mq5_" + secrets.token_hex(4)
WORKER = "campusloop-mq5-audit-worker-1"
for c in [API, DB, WORKER]:
    info = json.loads(subprocess.check_output(["docker", "inspect", c]))[0]
    if info["Config"]["Labels"].get("com.docker.compose.project") != "campusloop-mq5-audit":
        raise RuntimeError("Refusing a non-audit container")
worker_info = json.loads(subprocess.check_output(["docker", "inspect", WORKER]))[0]
was_running = worker_info["State"]["Running"]
try:
    if was_running:
        subprocess.run(["docker", "stop", WORKER], check=True)

    def snapshot(database=None):
        args = ["docker", "exec"]
        if database:
            args += [
                "-e",
                "DATABASE_URL=postgresql+psycopg://campusloop:campusloop@db:5432/" + database,
            ]
        return subprocess.check_output(
            args + [API, "python", "scripts/verify_restore.py"], stderr=subprocess.DEVNULL
        )

    before = snapshot()
    (R / "restore-before.json").write_bytes(before)
    raw = subprocess.check_output(
        ["docker", "exec", DB, "pg_dump", "-U", "campusloop", "-d", "campusloop", "-Fc"]
    )
    dump = Path(".codex-tmp/recovery.dump")
    dump.write_bytes(raw)
    print("backupBytes", len(raw), "sha256", hashlib.sha256(raw).hexdigest(), flush=True)
    subprocess.run(
        [
            "docker",
            "exec",
            DB,
            "psql",
            "-U",
            "campusloop",
            "-d",
            "postgres",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            "CREATE DATABASE " + TARGET + ";",
        ],
        check=True,
    )
    tick = time.monotonic()
    subprocess.run(
        ["docker", "exec", "-i", DB, "pg_restore", "-U", "campusloop", "-d", TARGET, "--no-owner"],
        input=raw,
        check=True,
    )
    after = snapshot(TARGET)
    (R / "restore-after.json").write_bytes(after)
    a = json.loads(before)
    b = json.loads(after)
    for key in ("formatVersion", "alembic_version", "tables", "contentHashes"):
        assert a[key] == b[key], key
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "normalize", Path(__file__).with_name("recovery_constraints.py")
    )
    normal = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(normal)

    def schema(database):
        code = "import psycopg,os,json; c=psycopg.connect(os.environ['DATABASE_URL'].replace('postgresql+psycopg://','postgresql://')); x=c.cursor(); x.execute(\"SELECT c.relname,x.conname,pg_get_constraintdef(x.oid) FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,x.conname\"); a=x.fetchall(); x.execute(\"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname\"); print(json.dumps([a,x.fetchall()]))"
        raw = subprocess.check_output(
            [
                "docker",
                "exec",
                "-e",
                "DATABASE_URL=postgresql+psycopg://campusloop:campusloop@db:5432/" + database,
                API,
                "python",
                "-c",
                code,
            ]
        )
        return [
            [[row[0], row[1], normal.canonical_definition(row[2])] for row in group]
            for group in json.loads(raw)
        ]

    canonical_before = schema("campusloop")
    canonical_after = schema(TARGET)
    assert canonical_before == canonical_after, "non-equivalent constraints/indexes"
    (R / "canonical-constraints.json").write_text(
        json.dumps({"before": canonical_before, "after": canonical_after}, indent=2),
        encoding="utf-8",
    )
    # Real negative check: deleting a restored constraint must fail canonical equality.
    subprocess.run(
        [
            "docker",
            "exec",
            DB,
            "psql",
            "-U",
            "campusloop",
            "-d",
            TARGET,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            "ALTER TABLE users DROP CONSTRAINT ck_users_role_enum;",
        ],
        check=True,
    )
    assert schema(TARGET) != canonical_before
    print("Negative check passed: removed role constraint detected", flush=True)
    print(
        json.dumps(
            {
                "tables": len(a["tables"]),
                "counts": a["tables"],
                "migration": a["alembic_version"],
                "snapshotMatch": True,
                "restoreSeconds": round(time.monotonic() - tick, 3),
            },
            indent=2,
        ),
        flush=True,
    )
    # A corrupt archive must not pass pg_restore validation, and never touches the source DB.
    r = subprocess.run(
        ["docker", "exec", "-i", DB, "pg_restore", "--list"],
        input=b"corrupted" + raw[:40],
        capture_output=True,
    )
    assert r.returncode != 0
    assert snapshot() == before
    print("Corrupt archive rejected; original database unchanged", flush=True)
finally:
    # dropdb --if-exists is limited to our newly generated audit DB name.
    try:
        subprocess.run(
            ["docker", "exec", DB, "dropdb", "-U", "campusloop", "--if-exists", TARGET], check=True
        )
    finally:
        if was_running:
            subprocess.run(["docker", "start", WORKER], check=True)
