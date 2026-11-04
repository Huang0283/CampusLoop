"""Start an isolated T1/T2/T3 Docker environment and privately bootstrap R/S."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PORTS = {
    "business": (18024, 5184, 19024),
    "permission": (18025, 5185, 19027),
    "environment": (18026, 5186, 19026),
}


def private_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    path.chmod(0o600)


def source_sha():
    if (ROOT / ".git").exists():
        if subprocess.check_output(
            ["git", "diff", "HEAD", "--name-only"], cwd=ROOT
        ).strip():
            raise ValueError("Commit tracked changes before starting an audit image")
        untracked = subprocess.check_output(
            [
                "git",
                "ls-files",
                "--others",
                "--exclude-standard",
                "--",
                "backend",
                "services",
                "scripts",
                "schemas",
                "contracts",
                "data",
                "compose.audit.yml",
            ],
            cwd=ROOT,
        )
        if untracked.strip():
            raise ValueError(
                "Untracked application files exist; commit them before audit startup"
            )
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, encoding="utf-8"
        ).strip()
    manifest = json.loads((ROOT.parent / "MANIFEST.json").read_text(encoding="utf-8"))
    for item in manifest["files"]:
        if item["path"].startswith("source/"):
            path = (ROOT / item["path"][7:]).resolve()
            if (
                not path.is_relative_to(ROOT)
                or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]
            ):
                raise ValueError(
                    "Source bundle has changed; use a fresh verified extraction"
                )
    return manifest["sourceCommit"]


def initialize(namespace, run_id, *, existing_only=False):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,19}", run_id):
        raise ValueError("Run ID must be 1-20 lowercase letters, digits or hyphens")
    folder = ROOT / ".codex-tmp" / "audit" / namespace / run_id
    config_path = folder / "private-config.json"
    if config_path.exists():
        config = json.loads(config_path.read_text(encoding="utf-8"))
        if (
            config["AUDIT_NAMESPACE"] != namespace
            or config["AUDIT_RUN_ID"] != run_id
            or config["AUDIT_PROJECT"] != f"campusloop-{namespace}-{run_id}-audit"
        ):
            raise ValueError("Stored configuration does not match this audit batch")
        if not existing_only and config["AUDIT_SOFTWARE_SHA"] != source_sha():
            raise ValueError(
                "Software SHA changed; preserve this batch and use a new --run-id"
            )
        return folder, config
    if existing_only:
        raise ValueError("This audit batch has not been initialized")
    sha = source_sha()
    api, ui, storage = PORTS[namespace]
    project = f"campusloop-{namespace}-{run_id}-audit"
    config = dict(
        AUDIT_PROJECT=project,
        AUDIT_NAMESPACE=namespace,
        AUDIT_RUN_ID=run_id,
        AUDIT_SOFTWARE_SHA=sha,
        AUDIT_DATABASE=f"campusloop_audit_{namespace}_{run_id.replace('-', '_')}",
        AUDIT_API_PORT=str(api),
        AUDIT_UI_PORT=str(ui),
        AUDIT_STORAGE_PORT=str(storage),
        AUDIT_PUBLIC_BUCKET=project + "-public",
        AUDIT_PRIVATE_BUCKET=project + "-private",
        AUDIT_DB_PASSWORD=secrets.token_hex(24),
        AUDIT_STORAGE_USER="audit" + secrets.token_hex(8),
        AUDIT_STORAGE_PASSWORD=secrets.token_hex(24),
        AUTH_SIGNING_KEY=secrets.token_hex(48),
        BASELINE_RPC_TOKEN=secrets.token_hex(48),
        AUTH_COOKIE_SECURE="false",
        BASELINE_SERVICES_ENABLED="true",
        MATCHING_NOTIFICATIONS_ENABLED="true",
    )
    private_json(config_path, config)
    private_json(
        folder / "admins.json",
        {
            alias: {
                "email": f"t1-{namespace}-{run_id}-{alias.lower()}@example.invalid",
                "password": secrets.token_urlsafe(24),
            }
            for alias in ("R", "S")
        },
    )
    env_file = folder / ".env.audit"
    env_file.write_text(
        "".join(f"{key}={value}\n" for key, value in config.items()), encoding="utf-8"
    )
    env_file.chmod(0o600)
    return folder, config


def compose(folder, config, *args, capture=False):
    command = [
        "docker",
        "compose",
        "--project-directory",
        str(ROOT),
        "--env-file",
        str(folder / ".env.audit"),
        "-p",
        config["AUDIT_PROJECT"],
        "-f",
        str(ROOT / "docker-compose.yml"),
        "-f",
        str(ROOT / "compose.audit.yml"),
        *args,
    ]
    return subprocess.run(
        command,
        cwd=ROOT,
        env={**os.environ, **config},
        check=True,
        capture_output=capture,
        text=True,
        encoding="utf-8",
    )


def inspect_api(folder, config):
    container = compose(folder, config, "ps", "-q", "api", capture=True).stdout.strip()
    if not container:
        raise ValueError("Audit API is not running")
    info = json.loads(subprocess.check_output(["docker", "inspect", container]))[0]
    labels = info["Config"]["Labels"]
    env = dict(item.split("=", 1) for item in info["Config"]["Env"])
    if (
        labels.get("com.docker.compose.project") != config["AUDIT_PROJECT"]
        or labels.get("campusloop.audit.software-sha") != config["AUDIT_SOFTWARE_SHA"]
        or env.get("DATABASE_URL", "").split("/")[-1] != config["AUDIT_DATABASE"]
        or env.get("REDIS_URL") != "redis://redis:6379/15"
        or any(
            env.get(key) != config[value]
            for key, value in [
                ("MINIO_PUBLIC_BUCKET", "AUDIT_PUBLIC_BUCKET"),
                ("MINIO_PRIVATE_BUCKET", "AUDIT_PRIVATE_BUCKET"),
            ]
        )
        or any(
            mount.get("Name", "").startswith("campusloop-local")
            for mount in info["Mounts"]
        )
    ):
        raise ValueError("Running API is not the expected isolated audit target")
    return info["Name"].lstrip("/")


def check_configuration(folder, config):
    document = json.loads(
        compose(folder, config, "config", "--format", "json", capture=True).stdout
    )
    project = config["AUDIT_PROJECT"]
    for name, volume in document["volumes"].items():
        if volume.get("external") or volume.get("name") != f"{project}_{name}":
            raise ValueError("Compose would reuse a volume outside this audit project")
    services = document["services"]
    for service in ("db", "redis", "worker"):
        if services[service].get("ports"):
            raise ValueError(
                "Database, Redis and worker must stay on the private audit network"
            )
    for service, target, port in [
        ("api", 8000, "AUDIT_API_PORT"),
        ("minio", 9000, "AUDIT_STORAGE_PORT"),
    ]:
        ports = services[service].get("ports", [])
        if (
            len(ports) != 1
            or ports[0].get("host_ip") != "127.0.0.1"
            or str(ports[0]["published"]) != config[port]
            or ports[0]["target"] != target
        ):
            raise ValueError("Compose would publish an unexpected audit address")
    for service in ("api", "worker"):
        env = services[service]["environment"]
        if (
            env["DATABASE_URL"]
            != f'postgresql+psycopg://campusloop:{config["AUDIT_DB_PASSWORD"]}@db:5432/{config["AUDIT_DATABASE"]}'
            or env["REDIS_URL"] != "redis://redis:6379/15"
        ):
            raise ValueError(
                "Compose database/Redis target differs from the audit configuration"
            )


def api_call(config, method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = Request(
        f'http://127.0.0.1:{config["AUDIT_API_PORT"]}' + path,
        method=method,
        headers=headers,
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with urlopen(request, timeout=15) as response:
            content = response.read()
            return json.loads(content)["data"] if content else None
    except HTTPError as error:
        raise ValueError(
            f"Audit verification failed: HTTP {error.code} at {path}"
        ) from None


def bootstrap(folder, config):
    container = inspect_api(folder, config)
    credentials = json.loads((folder / "admins.json").read_text(encoding="utf-8"))
    result = subprocess.run(
        ["docker", "exec", "-i", container, "python", "scripts/seed_audit_admins.py"],
        input=json.dumps(credentials),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode:
        raise ValueError(
            "R/S initialization failed; passwords and private output were withheld"
        )
    identities = json.loads(result.stdout)
    for alias, account in credentials.items():
        login = api_call(config, "POST", "/auth/login", account)
        if (
            login["user"]["role"] != "ADMIN"
            or login["user"]["id"] != identities[alias]["id"]
        ):
            raise ValueError("R/S login did not match the seeded administrator")
        api_call(config, "GET", "/admin/users?pageSize=1", token=login["accessToken"])
        api_call(config, "POST", "/auth/logout", token=login["accessToken"])
    if identities["R"]["id"] == identities["S"]["id"]:
        raise ValueError("R and S must be different administrators")
    connection = dict(
        softwareSha=config["AUDIT_SOFTWARE_SHA"],
        namespace=config["AUDIT_NAMESPACE"],
        runId=config["AUDIT_RUN_ID"],
        project=config["AUDIT_PROJECT"],
        api=f'http://127.0.0.1:{config["AUDIT_API_PORT"]}',
        ui=f'http://127.0.0.1:{config["AUDIT_UI_PORT"]}',
        container=container,
        database=config["AUDIT_DATABASE"],
        redisDb=15,
        publicBucket=config["AUDIT_PUBLIC_BUCKET"],
        privateBucket=config["AUDIT_PRIVATE_BUCKET"],
        identities=identities,
    )
    private_json(folder / "connection.json", connection)
    print(json.dumps(connection, ensure_ascii=False, indent=2))
    print(f"Private R/S credentials: {folder / 'admins.json'} (not printed)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "status", "stop", "ui"))
    parser.add_argument("--namespace", choices=tuple(PORTS), required=True)
    parser.add_argument("--run-id", default="run1")
    args = parser.parse_args()
    folder, config = initialize(
        args.namespace, args.run_id, existing_only=args.action in {"stop", "status"}
    )
    if args.action == "start":
        check_configuration(folder, config)
        compose(folder, config, "build", "api")
        compose(folder, config, "build", "minio")
        compose(
            folder, config, "up", "-d", "--no-build", "--wait", "--wait-timeout", "180"
        )
        bootstrap(folder, config)
        print(
            f"Next terminal: python scripts/audit_env.py ui --namespace {args.namespace} --run-id {args.run_id}"
        )
    elif args.action == "status":
        bootstrap(folder, config)
    elif args.action == "stop":
        compose(folder, config, "stop")
        print("Audit services stopped. All audit volumes and credentials retained.")
    else:
        inspect_api(folder, config)
        node = shutil.which("node")
        vite = ROOT / "frontend/node_modules/vite/bin/vite.js"
        if not node or not vite.exists():
            raise ValueError(
                "Install Node.js 22+ and run npm ci --prefix frontend first"
            )
        subprocess.run(
            [
                node,
                str(vite),
                "--host",
                "127.0.0.1",
                "--port",
                config["AUDIT_UI_PORT"],
                "--strictPort",
            ],
            cwd=ROOT / "frontend",
            env={
                **os.environ,
                "VITE_API_BASE_URL": f'http://127.0.0.1:{config["AUDIT_API_PORT"]}',
            },
            check=True,
        )


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(
            str(error)
            if isinstance(error, ValueError)
            else "Audit command failed; no credentials were printed."
        ) from None
