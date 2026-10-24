"""Exercise recovery at the real HTTP boundary, without replacing the client."""
import copy
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import threading
import time
import unittest

import test_engine as fixtures
from services.m7_baseline.client import call_baseline
from services.m7_baseline.engine import ServiceError, rank


class ResponseRecoveryTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        self.payload = dict(schemaVersion="m7-baseline-rpc-v1", products=[fixture.product],
                            request=fixture.request, dictionary=fixture.dictionary)
        self.payload["request"]["context"]["asOf"] = datetime.now(timezone.utc).isoformat()
        self.expected = self.local()
        self.body = self.envelope(self.expected)
        self.status = 200
        self.delay = 0
        self.token = "temporary-response-contract-test-" + "x" * 32
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                self.rfile.read(int(self.headers["Content-Length"]))
                time.sleep(outer.delay)
                body = outer.body if isinstance(outer.body, bytes) else json.dumps(outer.body, allow_nan=True).encode("utf-8")
                try:
                    self.send_response(outer.status)
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                except OSError:
                    pass

            def log_message(self, *args):
                pass

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.01), daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)
        self.url = "http://127.0.0.1:" + str(self.server.server_port)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(3)

    def local(self):
        return rank(self.payload["products"], self.payload["request"], self.payload["dictionary"], **self.payload.get("options", {}))

    @staticmethod
    def envelope(data):
        return dict(schemaVersion="m7-baseline-rpc-v1", data=copy.deepcopy(data))

    def call(self, timeout=1):
        return call_baseline(self.url, self.payload, self.token, timeout=timeout)

    def assert_recovered(self, reason="INVALID_SERVICE_RESPONSE"):
        result = self.call()
        self.assertEqual(result["items"], self.local()["items"])
        self.assertTrue(result["metadata"]["degraded"])
        self.assertEqual(result["metadata"]["fallbackReason"], reason)

    def test_malformed_json_and_envelopes_recover_to_the_filtered_baseline(self):
        cases = [b"not json", b'{"x":NaN}', b'{"data":{},"data":{}}', b'"text"', b"null", b"[]",
                 {}, {"schemaVersion": "wrong", "data": self.expected},
                 {"schemaVersion": "m7-baseline-rpc-v1"}, self.envelope(None)]
        for body in cases:
            with self.subTest(body=repr(body)[:120]):
                self.body = body
                self.assert_recovered()

    def test_missing_or_invalid_data_fields_recover_instead_of_returning_broken_dtos(self):
        invalid = [None, [], {}, {"items": []}, {"items": "bad", "metadata": self.expected["metadata"]}]
        for path, value in [(('items',), None), (('metadata',), {}),
                            (('metadata', 'algorithmVersion'), 'future-unapproved'),
                            (('metadata', 'dictionaryHash'), 'wrong'),
                            (('metadata', 'modelVersion'), 'undeployed-model'),
                            (('metadata', 'asOf'), '2026-01-01T00:00:00Z'),
                            (('items', 0, 'relevanceScore'), float('nan')),
                            (('items', 0, 'relevanceScore'), True),
                            (('items', 0, 'reasons'), []),
                            (('items', 0, 'explanationDetails'), 'bad')]:
            data = copy.deepcopy(self.expected)
            target = data
            for key in path[:-1]:
                target = target[key]
            target[path[-1]] = value
            invalid.append(data)
        for index, data in enumerate(invalid):
            with self.subTest(case=index):
                self.body = self.envelope(data)
                self.assert_recovered()

    def test_unknown_duplicate_or_stale_products_do_not_escape_the_caller_pool(self):
        for change in ('unknown', 'duplicate', 'stale'):
            with self.subTest(change=change):
                data = copy.deepcopy(self.expected)
                if change == 'unknown':
                    data['items'][0]['productId'] = '999999'
                elif change == 'duplicate':
                    data['items'].append(copy.deepcopy(data['items'][0]))
                else:
                    data['items'][0]['productVersion'] += 1
                self.body = self.envelope(data)
                self.assert_recovered()

    def test_valid_keyword_semantic_disabled_browse_and_empty_results_are_preserved(self):
        for query, options in [('计算器', {}), ('计算器', {'mode': 'semantic'}), ('', {}), ('zzzzunavailable', {})]:
            with self.subTest(query=query, options=options):
                self.payload['request']['queryText'] = query
                self.payload['options'] = options
                expected = self.local()
                self.body = self.envelope(expected)
                self.assertEqual(self.call(), expected)

    def test_error_statuses_never_fall_back_around_permission_or_state_rejection(self):
        for status in (401, 403, 409, 422):
            with self.subTest(status=status):
                self.status, self.body = status, b'not even valid JSON'
                with self.assertRaises(ServiceError) as caught:
                    self.call()
                self.assertEqual(caught.exception.status, status)

    def test_503_504_and_timeout_recover_with_explicit_reasons(self):
        for status, reason in [(503, 'SERVICE_UNAVAILABLE'), (504, 'SERVICE_TIMEOUT')]:
            self.status, self.body = status, {}
            self.assert_recovered(reason)
        self.status, self.delay = 200, 0.15
        result = self.call(timeout=0.03)
        self.assertTrue(result['metadata']['degraded'])
        self.assertEqual(result['metadata']['fallbackReason'], 'SERVICE_TIMEOUT')

    def test_invalid_reply_cannot_turn_stale_input_into_a_current_result(self):
        self.payload['request']['context']['asOf'] = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        self.body = self.envelope({})
        with self.assertRaises(ServiceError) as caught:
            self.call()
        self.assertEqual(caught.exception.code, 'STALE_INPUT')


if __name__ == '__main__':
    unittest.main()
