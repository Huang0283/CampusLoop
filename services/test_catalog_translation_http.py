"""HTTP trust checks and batch failure isolation without loading model weights."""

import json
import threading
import unittest
from collections import OrderedDict
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from unittest.mock import patch

from services import catalog_translation_server as service


class TranslationHttpTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), service.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.thread.join)
        self.addCleanup(self.server.shutdown)

    def request(self, headers, data=None, method="POST"):
        connection = HTTPConnection(*self.server.server_address, timeout=3)
        self.addCleanup(connection.close)
        connection.request(method, "/translate", data or json.dumps({"target": "zh", "texts": ["Apple"]}), headers)
        response = connection.getresponse()
        return response.status, json.loads(response.read() or "{}")

    def test_untrusted_and_simple_cross_site_posts_never_start_inference(self):
        with patch.object(service, "translate") as translate:
            self.assertEqual(self.request({"Origin": "https://attacker.invalid", "Content-Type": "application/json"})[0], 403)
            self.assertEqual(self.request({"Content-Type": "text/plain"})[0], 415)
            self.assertEqual(self.request({"Origin": "null", "Content-Type": "application/json"})[0], 403)
            translate.assert_not_called()

    def test_trusted_ui_and_originless_json_clients_remain_supported(self):
        for origin in (None, "http://127.0.0.1:5174", "http://localhost:5184", "http://127.0.0.1:5185"):
            headers = {"Content-Type": "application/json"}
            if origin:
                headers["Origin"] = origin
            status, body = self.request(headers)
            self.assertEqual(status, 200)
            self.assertEqual(body, {"translations": ["Apple"]})

    def test_invalid_json_shape_has_a_validation_response(self):
        self.assertEqual(self.request({"Content-Type": "application/json"}, "[]")[0], 422)

    def test_batch_continues_after_a_rejected_description_without_caching_failure(self):
        def infer(text, _):
            if text == "错误描述":
                raise ValueError("protected facts changed")
            return "Textbook"

        with patch.object(service, "translations", OrderedDict()), patch.object(service, "translate_content", side_effect=infer):
            status, body = self.request({"Content-Type": "application/json"}, json.dumps({"target": "en", "texts": ["错误描述", "校园书册"]}))
            self.assertEqual(status, 200)
            self.assertEqual(body["translations"], [None, "Textbook"])
            self.assertNotIn(("错误描述", "en"), service.translations)
            self.assertEqual(service.translations[("校园书册", "en")], "Textbook")


if __name__ == "__main__":
    unittest.main()
