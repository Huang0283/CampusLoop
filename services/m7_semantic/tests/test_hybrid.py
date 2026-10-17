import copy
import json
import unittest
from services.m7_baseline.tests import test_engine as fixtures
from services.m7_baseline.engine import ServiceError, rank as baseline
from services.m7_semantic.hybrid import rank
from services.m7_semantic.index import VectorIndex
from services.m7_semantic.model import CandidateUnavailable, identity


class HybridTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        self.p, self.r, self.d = fixture.product, fixture.request, fixture.dictionary
        class Encoder:
            identity = identity(self.d)
            def encode(self, texts, *, query=False):
                return [[1, 0] for t in texts]
        self.encoder = Encoder()
        self.index = VectorIndex(":memory:", identity=self.encoder.identity, dimension=2)
        self.addCleanup(self.index.close)

    def call(self, products=None, **kwargs):
        return rank(products or [self.p], self.r, self.d, encoder=self.encoder, index=self.index,
                    experimental=True, **kwargs)

    def test_hard_filters_precede_vector_scoring(self):
        products = [self.p]
        for i, changes in enumerate([{"status": "SOLD"}, {"deleted": True}, {"visibility": "campus"},
                                     {"priceFen": 9999999}, {"condition": None}], 102):
            p = copy.deepcopy(self.p)
            p.update(productId=str(i), **changes)
            products.append(p)
        self.r["filters"]["minCondition"] = "good"
        self.index.rebuild(products, [[1, 0]] * len(products))
        self.assertEqual([x["productId"] for x in self.call(products)["items"]], ["101"])

    def test_rrf_contributions_and_version_are_explained(self):
        self.index.rebuild([self.p], [[1, 0]])
        result = self.call()
        self.assertAlmostEqual(result["items"][0]["relevanceScore"], 2 / 61)
        details = result["items"][0]["explanationDetails"][-1]
        self.assertEqual((details["keywordRank"], details["vectorRank"]), (1, 1))
        self.assertFalse(details["scoreIsProbability"])

    def test_missing_index_has_explicit_baseline_fallback(self):
        result = self.call()
        self.assertEqual(result["metadata"]["fallbackReason"], "INDEX_NOT_READY")
        self.assertEqual(result["items"], baseline([self.p], self.r, self.d)["items"])

    def test_encoder_dictionary_mismatch_falls_back(self):
        self.index.rebuild([self.p], [[1, 0]])
        self.d["version"] = "next-version"
        self.assertEqual(self.call()["metadata"]["fallbackReason"], "ENCODER_VERSION_MISMATCH")

    def test_model_failure_falls_back(self):
        def failure(*args, **kwargs):
            raise CandidateUnavailable("MODEL_LOAD_FAILURE")
        self.encoder.encode = failure
        self.assertEqual(self.call()["metadata"]["fallbackReason"], "MODEL_LOAD_FAILURE")

    def test_stale_facts_and_incompatible_index_fall_back_without_old_results(self):
        self.index.rebuild([self.p], [[1, 0]])
        self.p["title"] += " 新事实"
        self.assertEqual(self.call()["metadata"]["fallbackReason"], "INDEX_FACTS_STALE")
        self.index.identity = "older-model"
        self.index.rebuild([self.p], [[1, 0]])
        self.assertEqual(self.call()["metadata"]["fallbackReason"], "INDEX_VERSION_MISMATCH")

    def test_empty_query_and_explicit_sort_preserve_baseline(self):
        self.r["queryText"] = ""
        self.assertEqual(self.call(), baseline([self.p], self.r, self.d))
        self.r["queryText"] = "计算器"
        self.assertEqual(self.call(sort="price_asc"), baseline([self.p], self.r, self.d, sort="price_asc"))

    def matching(self):
        path = fixtures.ROOT / "data/m7-phase2/derived/requests.jsonl"
        self.r = next(json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()
                      if json.loads(line)["requestId"] == "calculator-matching")
        self.r["filters"]["requiredModel"] = None

    def test_wrong_owner_rejected_even_when_index_is_unavailable(self):
        self.matching()
        self.r["context"]["viewerId"] = "9999"
        with self.assertRaises(ServiceError) as caught:
            self.call()
        self.assertEqual(caught.exception.code, "FORBIDDEN")

    def test_expired_wanted_rejected_before_model(self):
        self.matching()
        self.r["wanted"]["expiresAt"] = "2026-01-01T00:00:00Z"
        with self.assertRaises(ServiceError) as caught:
            self.call()
        self.assertEqual(caught.exception.code, "WANTED_INACTIVE")

    def test_matching_works_without_keyword_overlap(self):
        self.matching()
        self.r["queryText"] = "考试辅助工具"
        self.index.rebuild([self.p], [[1, 0]])
        self.assertEqual(self.call()["metadata"]["mode"], "experimental_hybrid")

    def test_inputs_are_not_mutated(self):
        before = copy.deepcopy((self.p, self.r, self.d))
        self.index.rebuild([self.p], [[1, 0]])
        self.call()
        self.assertEqual(before, (self.p, self.r, self.d))


if __name__ == "__main__":
    unittest.main()
