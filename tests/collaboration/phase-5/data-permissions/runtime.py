"""Shared local audit runner; no application permissions are changed here."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
NAMESPACES = ("permission", "business", "environment", "experience", "demo")


def read(name):
    return json.loads((BASE / name).read_text(encoding="utf-8"))


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".pending")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def arguments(description):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "--api", required=True, help="Explicit loopback audit API; no daily default"
    )
    parser.add_argument("--container", required=True, help="Docker audit API container to inspect")
    parser.add_argument("--namespace", choices=NAMESPACES, required=True)
    parser.add_argument("--run-id", required=True, help="Lowercase letters/digits/hyphens, max 20")
    parser.add_argument(
        "--state-dir",
        required=True,
        type=Path,
        help="Private ignored .codex-tmp directory",
    )
    return parser


def guard(args):
    """Inspect actual container configuration instead of trusting a supplied assertion."""
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,19}", args.run_id):
        raise ValueError("Invalid run ID")
    api = urlsplit(args.api)
    if (
        api.scheme != "http"
        or api.hostname not in {"localhost", "127.0.0.1"}
        or api.username
        or api.password
        or api.query
        or api.fragment
        or api.path not in {"", "/"}
        or api.port in {None, 8000, 8001}
    ):
        raise ValueError("Use a dedicated loopback API port (not daily 8001)")
    if ".codex-tmp" not in args.state_dir.resolve().parts:
        raise ValueError("Private state must be stored under an ignored .codex-tmp directory")
    info = json.loads(subprocess.check_output(["docker", "inspect", args.container]))[0]
    env = dict(item.split("=", 1) for item in info["Config"]["Env"])
    bindings = info["NetworkSettings"]["Ports"].get("8000/tcp") or []
    if not info["State"]["Running"] or not any(
        b["HostIp"] == "127.0.0.1" and int(b["HostPort"]) == api.port for b in bindings
    ):
        raise ValueError("API does not match the running loopback audit container")
    database = urlsplit(env.get("DATABASE_URL", "")).path.lstrip("/")
    redis_db = urlsplit(env.get("REDIS_URL", "")).path
    buckets = [env.get(key, "") for key in ("MINIO_PUBLIC_BUCKET", "MINIO_PRIVATE_BUCKET")]
    sha = (info["Config"].get("Labels") or {}).get("campusloop.audit.software-sha", "")
    if (
        env.get("APP_ENV") not in {"test", "ci"}
        or "_audit_" not in database
        or redis_db not in {"/14", "/15"}
        or any("audit" not in b for b in buckets)
        or len(set(buckets)) != 2
        or not re.fullmatch(r"[0-9a-f]{40}", sha)
    ):
        raise ValueError(
            "Audit database, Redis 14/15, isolated buckets and software SHA are required"
        )
    media_base = env.get("S3_PUBLIC_BASE_URL", "").rstrip("/")
    if urlsplit(media_base).path.strip("/") != buckets[0]:
        raise ValueError("Public media URL does not match the audit bucket")
    domains = env.get("AUTH_REGISTRATION_DOMAINS", "example.com,example.invalid").split(",")
    if "example.invalid" not in [d.strip().lower() for d in domains]:
        raise ValueError("Audit API must allow reserved example.invalid test addresses")
    return {
        "containerId": info["Id"],
        "api": args.api.rstrip("/"),
        "database": database,
        "redisDb": redis_db,
        "buckets": buckets,
        "mediaBase": media_base,
        "softwareSha": sha,
    }


class ApiError(RuntimeError):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(f"API HTTP {status}: {code}")


class Client:
    def __init__(self, base):
        self.base = base

    def call(self, method, path, body=None, token=None, key=None, content_type=None):
        headers = {}
        if body is not None and not isinstance(body, bytes):
            body = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if content_type:
            headers["Content-Type"] = content_type
        if token:
            headers["Authorization"] = "Bearer " + token
        if key:
            headers["Idempotency-Key"] = key
        request = Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read()
                result = json.loads(raw) if raw else None
                if result is not None and result.get("code") != 0:
                    raise RuntimeError("Unexpected success envelope")
                return result["data"] if result else None
        except HTTPError as exc:
            try:
                code = json.loads(exc.read()).get("code", "UNKNOWN")
            except (ValueError, AttributeError):
                code = "NON_JSON_ERROR"
            # No request bodies, headers or private response bodies in errors.
            raise ApiError(exc.code, code) from None

    def upload(self, path, token):
        boundary = "campusloop-fixture-boundary"
        mime = "image/png" if path.suffix == ".png" else "image/jpeg"
        body = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{path.name}"\r\nContent-Type: {mime}\r\n\r\n'
        ).encode()
        body += path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        return self.call(
            "POST",
            "/uploads/images?purpose=product",
            body,
            token,
            content_type=f"multipart/form-data; boundary={boundary}",
        )


def open_state(args, create=False):
    environment = guard(args)
    dataset_hash = hashlib.sha256()
    for source in sorted(BASE.glob("*.json")) + [BASE / "media-manifest.csv"]:
        dataset_hash.update(
            source.name.encode() + b"\0" + source.read_text(encoding="utf-8").encode()
        )
    dataset_sha = dataset_hash.hexdigest()
    prefix = f"t1-{args.namespace}-{args.run_id}"
    path = args.state_dir.resolve() / (prefix + ".json")
    if path.exists():
        state = json.loads(path.read_text(encoding="utf-8"))
        if (
            state["environment"] != environment
            or state["prefix"] != prefix
            or state.get("datasetSha256") != dataset_sha
            or state.get("lifecycle") != "active"
        ):
            raise ValueError("Manifest/environment mismatch or reset run; use a new run ID")
    elif create:
        state = {
            "version": 1,
            "prefix": prefix,
            "namespace": args.namespace,
            "runId": args.run_id,
            "datasetSha256": dataset_sha,
            "environment": environment,
            "lifecycle": "active",
            "accounts": {},
            "media": {},
            "products": {},
            "wanted": {},
            "blocked": [],
        }
        save(path, state)
    else:
        raise ValueError("Manifest does not exist; run setup first")
    return path, state, Client(environment["api"])


def token_for(client, account):
    if not account.get("accessToken"):
        result = client.call("POST", "/auth/login", {k: account[k] for k in ("email", "password")})
        account["accessToken"] = result["accessToken"]
    try:
        profile = client.call("GET", "/users/me", token=account["accessToken"])
    except ApiError as exc:
        if exc.status != 401:
            raise
        result = client.call("POST", "/auth/login", {k: account[k] for k in ("email", "password")})
        account["accessToken"] = result["accessToken"]
        profile = result["user"]
    if account.get("id") and account["id"] != profile["id"]:
        raise ValueError("Account identity differs from manifest")
    return account["accessToken"], profile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_media_hash(url):
    """Called only after checking the inspected audit media/owner prefix."""
    import io

    from PIL import Image

    with urlopen(url, timeout=15) as response:
        content = response.read(5 * 1024 * 1024 + 1)
        if response.headers.get_content_type() != "image/jpeg" or len(content) > 5 * 1024 * 1024:
            raise ValueError("Stored audit image type/size mismatch")
    with Image.open(io.BytesIO(content)) as image:
        if image.format != "JPEG":
            raise ValueError("Stored upload must be normalized JPEG")
        image.verify()
    return hashlib.sha256(content).hexdigest()
