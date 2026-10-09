import copy
import json
from pathlib import Path
import unittest

from services.m7_baseline import engine


ROOT = Path(__file__).resolve().parents[3]


def read(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def row(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8").splitlines()[0])


class RankingTests(unittest.TestCase):
    def setUp(self):
        self.dictionary = read("data/m7-phase2/raw/dictionary.json")
        self.product = row("data/m7-phase2/derived/products.jsonl")
        self.product.update(title="计算器", description="", priceFen=18000)
        self.product["attributes"]["model"] = None
        requests = (ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()
        self.request = next(json.loads(line) for line in requests if json.loads(line)["requestId"] == "calculator-search-exact")
        self.request["queryText"] = "计算器"

    def test_keyword_title_weight_matches_published_hand_example(self):
        result = engine.rank([self.product], self.request, self.dictionary)
        self.assertEqual(result["items"][0]["productId"], "101")
        self.assertAlmostEqual(result["items"][0]["relevanceScore"], 0.4444444444444444)

    def test_hard_filters_precede_search_scores_and_do_not_expand_public_visibility(self):
        products = [self.product]
        for pid, changes in [("102", {"status": "SOLD"}), ("103", {"priceFen": 20001}),
                             ("104", {"categoryId": "monitor"}), ("105", {"visibility": "campus"}),
                             ("106", {"condition": None})]:
            product = copy.deepcopy(self.product)
            product.update(productId=pid, **changes)
            products.append(product)
        self.request["filters"]["minCondition"] = "good"
        self.request["context"].update(viewerId="8001", campusId="campus-1")
        result = engine.rank(products, self.request, self.dictionary)
        self.assertEqual([item["productId"] for item in result["items"]], ["101"])

    def test_matching_keeps_eligible_zero_text_score_and_explains_budget(self):
        requests = (ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()
        request = next(json.loads(line) for line in requests if json.loads(line)["requestId"] == "calculator-matching")
        request["queryText"] = "无词命中的愿望"
        request["filters"]["requiredModel"] = None
        result = engine.rank([self.product], request, self.dictionary)
        self.assertEqual(result["items"][0]["relevanceScore"], 0.0)
        budget = next(r for r in result["items"][0]["explanationDetails"] if r["code"] == "BUDGET_MATCH")
        self.assertEqual(budget["observed"], 18000)
        self.assertIsNone(budget["contribution"])

    def test_matching_without_text_returns_null_score_not_perfect_score(self):
        requests = (ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()
        request = next(json.loads(line) for line in requests if json.loads(line)["requestId"] == "calculator-matching")
        request["queryText"] = ""
        request["filters"]["requiredModel"] = None
        result = engine.rank([self.product], request, self.dictionary)
        self.assertIsNone(result["items"][0]["relevanceScore"])
        self.assertEqual(result["items"][0]["scoreType"], "constraints_only")
        self.assertFalse(any(r["kind"] == "factor" for r in result["items"][0]["explanationDetails"]))

    def test_unknown_request_fields_are_rejected_instead_of_silently_ignored(self):
        self.request["unsupportedSoftBrandPreference"] = "unapproved"
        with self.assertRaises(engine.ServiceError) as caught:
            engine.rank([self.product], self.request, self.dictionary)
        self.assertEqual((caught.exception.status, caught.exception.code), (422, "VALIDATION_ERROR"))

    def test_matching_cannot_be_read_by_another_wanted_owner(self):
        requests = (ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()
        request = next(json.loads(line) for line in requests if json.loads(line)["requestId"] == "calculator-matching")
        request["filters"]["requiredModel"] = None
        request["context"]["viewerId"] = "9999"
        with self.assertRaises(engine.ServiceError) as caught:
            engine.rank([self.product], request, self.dictionary)
        self.assertEqual((caught.exception.status, caught.exception.code), (403, "FORBIDDEN"))

    def test_relevance_ties_use_publication_time_then_numeric_id_and_price_sort(self):
        second = copy.deepcopy(self.product)
        second.update(productId="102", publishedAt="2026-09-26T09:00:00Z", priceFen=10000)
        self.product["publishedAt"] = "2026-09-25T09:00:00Z"
        result = engine.rank([self.product, second], self.request, self.dictionary)
        self.assertEqual([r["productId"] for r in result["items"]], ["102", "101"])
        result = engine.rank([self.product, second], self.request, self.dictionary, sort="price_desc")
        self.assertEqual([r["productId"] for r in result["items"]], ["101", "102"])

    def test_blank_browse_has_null_score_but_punctuation_is_not_browse(self):
        self.request["queryText"] = "  "
        result = engine.rank([self.product], self.request, self.dictionary)
        self.assertIsNone(result["items"][0]["relevanceScore"])
        self.request["queryText"] = "!!!"
        with self.assertRaises(engine.ServiceError) as caught:
            engine.rank([self.product], self.request, self.dictionary)
        self.assertEqual(caught.exception.code, "EMPTY_SEARCH_TERMS")

    def test_unavailable_semantic_candidate_returns_versioned_explicit_rule_fallback(self):
        result = engine.rank([self.product], self.request, self.dictionary, mode="semantic")
        self.assertEqual(result["metadata"]["fallbackReason"], "MODEL_DISABLED")
        self.assertTrue(result["metadata"]["degraded"])
        self.assertIsNone(result["metadata"]["modelVersion"])
        self.assertEqual(result["metadata"]["algorithmVersion"], "m7-keyword-v0")
        self.assertEqual(result["metadata"]["dictionaryVersion"], "m7-fixture-dictionary-v1")

    def test_invalid_dictionary_rank_types_are_dependency_failure(self):
        self.dictionary["conditionRank"]["poor"] = True
        with self.assertRaises(engine.ServiceError) as caught:
            engine.rank([self.product], self.request, self.dictionary)
        self.assertEqual((caught.exception.status, caught.exception.code), (503, "DEPENDENCY_UNAVAILABLE"))

    def test_missing_category_display_name_does_not_turn_raw_id_into_search_text(self):
        self.request["queryText"] = "calculator"
        self.assertEqual(engine.rank([self.product], self.request, self.dictionary)["items"], [])
        self.dictionary["categoryNames"] = {"calculator": "calculator"}
        result = engine.rank([self.product], self.request, self.dictionary)
        self.assertAlmostEqual(result["items"][0]["relevanceScore"], 0.2222222222222222)


if __name__ == "__main__":
    unittest.main()
