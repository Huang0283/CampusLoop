"""Private M7 persistence boundary; business authority remains owned by M6."""
from contextlib import closing
import json
import sqlite3
import time
import uuid
from scripts.m7_phase2.contract_check import canonical, digest, task_key, validate_schema, ContractError
from .engine import ServiceError, rank, validate_inputs


class BaselineStore:
    def __init__(self, path):
        self.path = str(path)
        with closing(self.connect()) as db, db:
            db.execute("CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, created REAL NOT NULL, payload TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, task_key TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, content_hash TEXT NOT NULL, result TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS current_results (wanted_id INTEGER PRIMARY KEY, task_key TEXT NOT NULL)")

    def connect(self):
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        return db

    def submit(self, event_id, versions, products, request, dictionary):
        if not isinstance(event_id, str) or not 1 <= len(event_id) <= 128:
            raise ServiceError(422, "VALIDATION_ERROR")
        try:
            validate_schema("InputVersion", versions)
        except ContractError:
            raise ServiceError(422, "VALIDATION_ERROR") from None
        result = rank(products, request, dictionary)
        wanted = request["wanted"]
        if request["task"] != "matching" or wanted is None or versions["wantedId"] != int(wanted["wantedId"]) or versions["wantedVersion"] != wanted["entityVersion"] or versions["asOf"] != request["context"]["asOf"]:
            raise ServiceError(422, "VERSION_MISMATCH")
        key = task_key(versions)
        content = digest("input", [versions, sorted(products, key=canonical), request, dictionary])
        result.update(taskKey=key, input=versions, state="current", generatedAt=versions["asOf"],
                      notificationsEnabled=False, notificationIntentCount=0,
                      authorityStatus="CALLER_SNAPSHOT_NOT_M6_INTEGRATED")
        result["resultVersion"] = digest("m7result", {k: v for k, v in result.items() if k != "state"})
        with closing(self.connect()) as db, db:
            db.execute("BEGIN IMMEDIATE")
            event = db.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
            if event and event["content_hash"] != content:
                raise ServiceError(409, "EVENT_CONFLICT")
            current = db.execute("SELECT t.result FROM current_results c JOIN tasks t ON t.id=c.task_key WHERE c.wanted_id=?", (versions["wantedId"],)).fetchone()
            if current:
                previous = json.loads(current["result"])["input"]
                fields = ("wantedVersion", "catalogRevision", "authorizationRevision", "policyGeneration", "refreshGeneration")
                if any(versions[f] < previous[f] for f in fields):
                    raise ServiceError(409, "SUPERSEDED")
                if all(versions[f] == previous[f] for f in fields) and versions["asOf"] != previous["asOf"]:
                    raise ServiceError(409, "TASK_INPUT_CONFLICT")
            saved = db.execute("SELECT * FROM tasks WHERE id=?", (key,)).fetchone()
            if saved:
                if saved["content_hash"] != content:
                    raise ServiceError(409, "TASK_INPUT_CONFLICT")
                result = json.loads(saved["result"])
            else:
                db.execute("INSERT INTO tasks VALUES (?,?,?)", (key, content, canonical(result)))
            db.execute("INSERT OR IGNORE INTO events VALUES (?,?,?)", (event_id, content, key))
            db.execute("INSERT INTO current_results VALUES (?,?) ON CONFLICT(wanted_id) DO UPDATE SET task_key=excluded.task_key", (versions["wantedId"], key))
        return result

    def read_task(self, key):
        with closing(self.connect()) as db:
            saved = db.execute("SELECT result FROM tasks WHERE id=?", (key,)).fetchone()
            active = db.execute("SELECT 1 FROM current_results WHERE task_key=?", (key,)).fetchone()
        if saved is None:
            raise ServiceError(404, "NOT_FOUND")
        result = json.loads(saved["result"])
        result["state"] = "current" if active else "superseded"
        return result

    def current(self, wanted_id):
        with closing(self.connect()) as db:
            saved = db.execute("SELECT t.result FROM current_results c JOIN tasks t ON t.id=c.task_key WHERE c.wanted_id=?", (wanted_id,)).fetchone()
        if saved is None:
            raise ServiceError(404, "NOT_FOUND")
        return json.loads(saved["result"])

    def page(self, products, request, dictionary, *, size=20, snapshotVersion=None,
             scanPosition=0, now=None, mode="keyword", sort="relevance"):
        now = time.time() if now is None else now
        if type(size) is not int or not 1 <= size <= 100 or type(scanPosition) is not int or scanPosition < 0:
            raise ServiceError(422, "VALIDATION_ERROR")
        current = rank(products, request, dictionary, mode=mode, sort=sort)
        fingerprint = digest("query", [request, dictionary, mode, sort, current["metadata"]["algorithmVersion"]])
        product_hashes = {p["productId"]: digest("product", p) for p in validate_inputs(products, request, dictionary)}
        if snapshotVersion is None:
            if scanPosition:
                raise ServiceError(422, "INVALID_SNAPSHOT")
            snapshotVersion = uuid.uuid4().hex
            payload = dict(current, productHashes=product_hashes)
            with closing(self.connect()) as db, db:
                db.execute("INSERT INTO snapshots VALUES (?,?,?,?)", (snapshotVersion, fingerprint, now, canonical(payload)))
        else:
            with closing(self.connect()) as db:
                saved = db.execute("SELECT * FROM snapshots WHERE id=?", (snapshotVersion,)).fetchone()
            if saved is None or now >= saved["created"] + 300:
                raise ServiceError(409, "SNAPSHOT_EXPIRED")
            if saved["fingerprint"] != fingerprint:
                raise ServiceError(409, "INVALID_SNAPSHOT")
            payload = json.loads(saved["payload"])
        ordered = payload["items"]
        if scanPosition > len(ordered):
            raise ServiceError(422, "INVALID_SNAPSHOT")
        current_ids = {item["productId"] for item in current["items"]}
        valid = {item["productId"] for item in ordered if item["productId"] in current_ids
                 and product_hashes.get(item["productId"]) == payload["productHashes"].get(item["productId"])}
        items = []
        while scanPosition < len(ordered) and len(items) < size:
            item = ordered[scanPosition]
            scanPosition += 1
            if item["productId"] in valid:
                items.append(item)
        return dict(items=items, metadata=payload["metadata"], snapshotVersion=snapshotVersion,
                    nextScanPosition=scanPosition if scanPosition < len(ordered) else None,
                    total=len(ordered), totalIsExact=len(valid) == len(ordered))
