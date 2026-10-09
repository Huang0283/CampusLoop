from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import test_engine as fixtures
from services.m7_baseline.http_service import create_server
from services.m7_baseline.store import BaselineStore


class RpcTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        fixture.request["context"]["asOf"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.payload = dict(schemaVersion="m7-baseline-rpc-v1", products=[fixture.product],
                            request=fixture.request, dictionary=fixture.dictionary)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.token = "test-only-service-token-32-characters"
        self.server = create_server(("127.0.0.1", 0), BaselineStore(Path(self.temp.name) / "rpc.sqlite"), self.token)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)
        self.url = "http://127.0.0.1:" + str(self.server.server_port)

    def stop(self):
        self.server.shutdown()
        self.thread.join(3)
        self.server.server_close()

    def post(self, payload, token=None, path="/v1/rank", raw=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if raw is None else raw
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        try:
            response = urlopen(Request(self.url + path, data=body, headers=headers), timeout=3)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_real_versioned_rpc_requires_service_auth_and_returns_computed_rank(self):
        status, error = self.post(self.payload)
        self.assertEqual((status, error["error"]["code"]), (401, "UNAUTHORIZED"))
        status, result = self.post(self.payload, self.token)
        self.assertEqual(status, 200)
        self.assertEqual(result["data"]["items"][0]["productId"], "101")
        self.assertAlmostEqual(result["data"]["items"][0]["relevanceScore"], 0.4444444444444444)

    def test_duplicate_json_keys_cannot_hide_an_invalid_schema_version(self):
        encoded = json.dumps(self.payload).encode("utf-8")
        raw = b'{"schemaVersion":"unsupported",' + encoded[1:]
        status, error = self.post(self.payload, self.token, raw=raw)
        self.assertEqual((status, error["error"]["code"]), (422, "VALIDATION_ERROR"))

    def test_paged_rpc_uses_persisted_snapshot_and_rejects_changed_query(self):
        self.payload["options"] = {"size": 1}
        status, first = self.post(self.payload, self.token, path="/v1/page")
        self.assertEqual(status, 200)
        self.payload["options"]["snapshotVersion"] = first["data"]["snapshotVersion"]
        self.payload["request"]["queryText"] = "different"
        status, error = self.post(self.payload, self.token, path="/v1/page")
        self.assertEqual((status, error["error"]["code"]), (409, "INVALID_SNAPSHOT"))

    def test_snapshot_token_type_is_a_schema_error(self):
        self.payload["options"] = {"snapshotVersion": False}
        status, error = self.post(self.payload, self.token, path="/v1/page")
        self.assertEqual((status, error["error"]["code"]), (422, "VALIDATION_ERROR"))
