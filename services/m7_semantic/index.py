"""SQLite exact cosine index with atomic batches and versioned tombstones."""
import json
import sqlite3
from services.m7_baseline.engine import VALIDATORS
from .model import CandidateUnavailable, canonical, checked_vector, fingerprint


class VectorIndex:
    def __init__(self, path, *, identity, dimension=512):
        self.path, self.identity, self.dimension = str(path), identity, dimension
        try:
            self.connection = sqlite3.connect(self.path)
            self.connection.executescript("""
                CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS vectors (
                    id TEXT PRIMARY KEY, version INTEGER NOT NULL, facts TEXT NOT NULL,
                    vector TEXT, deleted INTEGER NOT NULL);
            """)
        except sqlite3.Error as exc:
            raise CandidateUnavailable("INDEX_UNAVAILABLE") from exc

    def close(self):
        self.connection.close()

    def _ready(self, identity):
        try:
            values = dict(self.connection.execute("SELECT key,value FROM metadata"))
        except sqlite3.Error as exc:
            raise CandidateUnavailable("INDEX_UNAVAILABLE") from exc
        if not values:
            raise CandidateUnavailable("INDEX_NOT_READY")
        if values != {"identity": identity, "dimension": str(self.dimension), "format": "m7-vector-index-v1"}:
            raise CandidateUnavailable("INDEX_VERSION_MISMATCH")

    def _row(self, product, vector):
        if not VALIDATORS["product"].is_valid(product):
            raise ValueError("INVALID_PRODUCT")
        deleted = product["status"] != "ON_SALE" or product["deleted"]
        return (product["productId"], product["entityVersion"], fingerprint(product),
                None if deleted else canonical(checked_vector(vector, self.dimension)), int(deleted))

    def rebuild(self, products, vectors):
        if len(products) != len(vectors):
            raise ValueError("BATCH_LENGTH_MISMATCH")
        rows = [self._row(p, v) for p, v in zip(products, vectors)]
        if len({r[0] for r in rows}) != len(rows):
            raise ValueError("DUPLICATE_PRODUCT")
        with self.connection:
            self.connection.execute("DELETE FROM vectors")
            self.connection.executemany("INSERT INTO vectors VALUES(?,?,?,?,?)", rows)
            self.connection.execute("DELETE FROM metadata")
            self.connection.executemany("INSERT INTO metadata VALUES(?,?)",
                                        [("identity", self.identity), ("dimension", str(self.dimension)),
                                         ("format", "m7-vector-index-v1")])

    def _apply(self, row):
        old = self.connection.execute("SELECT * FROM vectors WHERE id=?", (row[0],)).fetchone()
        if old:
            if row[1] < old[1]:
                return "STALE_IGNORED"
            if row[1] == old[1]:
                # Fact identity determines event idempotence; do not replace the
                # stored embedding for same-version retries with batch rounding.
                if row[2] != old[2] or row[4] != old[4]:
                    raise CandidateUnavailable("ENTITY_VERSION_CONFLICT")
                return "IDEMPOTENT"
        self.connection.execute("INSERT OR REPLACE INTO vectors VALUES(?,?,?,?,?)", row)
        return "APPLIED"

    def upsert(self, products, vectors):
        self._ready(self.identity)
        if len(products) != len(vectors):
            raise ValueError("BATCH_LENGTH_MISMATCH")
        rows = [self._row(p, v) for p, v in zip(products, vectors)]
        with self.connection:
            return [self._apply(row) for row in rows]

    def delete(self, product_id, version):
        self._ready(self.identity)
        if not isinstance(product_id, str) or not product_id.isascii() or not product_id.isdigit() or product_id.startswith("0") or type(version) is not int or version < 1:
            raise ValueError("INVALID_DELETE")
        with self.connection:
            return self._apply((product_id, version, fingerprint({"deletedId": product_id, "version": version}), None, 1))

    def logical_digest(self):
        self._ready(self.identity)
        return fingerprint({"identity": self.identity,
                            "rows": list(self.connection.execute("SELECT * FROM vectors ORDER BY id"))})

    def query(self, vector, eligible, *, identity, limit=100):
        self._ready(identity)
        if type(limit) is not int or limit < 1:
            raise ValueError("INVALID_LIMIT")
        vector = checked_vector(vector, self.dimension)
        hits = []
        try:
            for product in eligible:
                row = self.connection.execute("SELECT * FROM vectors WHERE id=?", (product["productId"],)).fetchone()
                if row is None or row[4] or row[1] != product["entityVersion"] or row[2] != fingerprint(product):
                    raise CandidateUnavailable("INDEX_FACTS_STALE")
                stored = checked_vector(json.loads(row[3]), self.dimension)
                hits.append((row[0], max(-1.0, min(1.0, sum(a * b for a, b in zip(vector, stored))))))
        except (sqlite3.Error, json.JSONDecodeError, TypeError) as exc:
            raise CandidateUnavailable("INDEX_UNAVAILABLE") from exc
        return sorted(hits, key=lambda hit: (-hit[1], int(hit[0])))[:limit]
