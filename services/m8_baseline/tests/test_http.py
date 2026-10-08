import json
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from services.m8_baseline.http_service import create_server


TOKEN = "m8-test-token-0123456789abcdef0123456789"
PRICE = {"category": "digital", "condition": "good", "originalPriceFen": 600000,
         "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": []}


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server(("127.0.0.1", 0), TOKEN)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = "http://127.0.0.1:" + str(cls.server.server_address[1])

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=2)

    def request(self, path, envelope, token=TOKEN, content_type="application/json"):
        body = json.dumps(envelope).encode("utf-8")
        request = Request(self.url + path, data=body, method="POST",
                          headers={"Authorization": "Bearer " + token, "Content-Type": content_type})
        try:
            with urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def test_versioned_price_route(self):
        status, result = self.request("/v1/price-advice", {"schemaVersion": "m8-baseline-rpc-v1", "payload": PRICE})
        self.assertEqual(200, status)
        self.assertEqual("m8-price-rule-v1", result["data"]["algorithmVersion"])

    def test_authentication_is_required(self):
        status, result = self.request("/v1/price-advice", {"schemaVersion": "m8-baseline-rpc-v1", "payload": PRICE}, token="wrong")
        self.assertEqual((401, "UNAUTHORIZED"), (status, result["error"]["code"]))

    def test_unknown_fields_are_rejected(self):
        status, result = self.request("/v1/price-advice", {"schemaVersion": "m8-baseline-rpc-v1", "payload": {**PRICE, "userId": "secret"}})
        self.assertEqual((422, "VALIDATION_ERROR"), (status, result["error"]["code"]))

    def test_wrong_media_type_is_rejected(self):
        status, result = self.request("/v1/price-advice", {"schemaVersion": "m8-baseline-rpc-v1", "payload": PRICE}, content_type="text/plain")
        self.assertEqual((415, "UNSUPPORTED_MEDIA_TYPE"), (status, result["error"]["code"]))


if __name__ == "__main__":
    unittest.main()
