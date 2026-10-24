import copy
import unittest
from services.m7_baseline.tests import test_engine as fixtures
from services.m7_semantic.model import identity
from services.m7_semantic.hybrid import rank


class CandidateTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        self.product, self.request, self.dictionary = fixture.product, fixture.request, fixture.dictionary

    def test_default_candidate_remains_explicitly_disabled(self):
        result = rank([self.product], self.request, self.dictionary)
        self.assertEqual(result["metadata"]["fallbackReason"], "MODEL_DISABLED")

    def test_permission_failure_is_not_downgraded_to_success(self):
        self.request["task"] = "matching"
        self.request["wanted"] = None
        with self.assertRaises(ValueError):
            rank([self.product], self.request, self.dictionary, experimental=True)

    def test_experimental_vector_recovers_item_without_keyword_overlap(self):
        self.request["queryText"] = "数学考试辅助工具"
        class Encoder:
            identity = identity(self.dictionary)
            def encode(self, texts, *, query=False):
                return [[1.0, 0.0] for _ in texts]
        class Index:
            def query(self, vector, eligible, *, identity, limit):
                return [(p["productId"], 1.0) for p in eligible]
        result = rank([self.product], self.request, self.dictionary,
                      encoder=Encoder(), index=Index(), experimental=True)
        self.assertEqual([r["productId"] for r in result["items"]], ["101"])
        self.assertEqual(result["metadata"]["mode"], "experimental_hybrid")
        self.assertEqual(result["items"][0]["scoreType"], "rrf_v1")


if __name__ == "__main__":
    unittest.main()
