import copy
import tempfile
import unittest
from pathlib import Path
from services.m7_baseline.tests import test_engine as fixtures
from services.m7_semantic.index import VectorIndex
from services.m7_semantic.model import CandidateUnavailable, checked_vector, document_text, normalize


class IndexTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        self.p = fixture.product
        self.d = fixture.dictionary
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "index.sqlite"
        self.index = VectorIndex(self.path, identity="test-only", dimension=2)
        self.addCleanup(self.tmp.cleanup)
        self.addCleanup(self.index.close)

    def ready(self):
        self.index.rebuild([self.p], [[1, 0]])

    def query(self, products=None, identity="test-only"):
        return self.index.query([1, 0], products if products is not None else [self.p], identity=identity, limit=1)

    def test_unready_index_fails_explicitly(self):
        with self.assertRaisesRegex(CandidateUnavailable, "INDEX_NOT_READY"):
            self.query()

    def test_schema_or_model_identity_mismatch_rejects_query(self):
        self.ready()
        with self.assertRaisesRegex(CandidateUnavailable, "VERSION_MISMATCH"):
            self.query(identity="next-schema")

    def test_rebuild_logical_digest_is_independent_of_input_order(self):
        second = copy.deepcopy(self.p)
        second["productId"] = "102"
        self.index.rebuild([self.p, second], [[1, 0], [0, 1]])
        digest = self.index.logical_digest()
        self.index.rebuild([second, self.p], [[0, 1], [1, 0]])
        self.assertEqual(digest, self.index.logical_digest())

    def test_filter_before_top_k_prevents_ineligible_starvation(self):
        second = copy.deepcopy(self.p)
        second["productId"] = "102"
        self.index.rebuild([self.p, second], [[0, 1], [1, 0]])
        self.assertEqual(self.query(), [("101", 0.0)])

    def test_duplicate_is_idempotent_and_older_update_is_ignored(self):
        self.ready()
        digest = self.index.logical_digest()
        self.assertEqual(self.index.upsert([self.p], [[1, 0]]), ["IDEMPOTENT"])
        self.assertEqual(self.index.upsert([self.p], [[1, .00000001]]), ["IDEMPOTENT"])
        old = copy.deepcopy(self.p)
        old.update(entityVersion=self.p["entityVersion"] - 1, title="older")
        self.assertEqual(self.index.upsert([old], [[0, 1]]), ["STALE_IGNORED"])
        self.assertEqual(digest, self.index.logical_digest())

    def test_same_version_different_facts_conflicts(self):
        self.ready()
        changed = copy.deepcopy(self.p)
        changed["priceFen"] += 1
        with self.assertRaisesRegex(CandidateUnavailable, "CONFLICT"):
            self.index.upsert([changed], [[1, 0]])

    def test_batch_conflict_rolls_back_prior_rows(self):
        self.ready()
        digest = self.index.logical_digest()
        second = copy.deepcopy(self.p)
        second["productId"] = "102"
        changed = copy.deepcopy(self.p)
        changed["title"] = "conflict"
        with self.assertRaises(CandidateUnavailable):
            self.index.upsert([second, changed], [[0, 1], [0, 1]])
        self.assertEqual(digest, self.index.logical_digest())

    def test_invalid_batch_does_not_replace_ready_index(self):
        self.ready()
        digest = self.index.logical_digest()
        with self.assertRaises(CandidateUnavailable):
            self.index.rebuild([self.p], [[float("nan"), 0]])
        self.assertEqual(digest, self.index.logical_digest())

    def test_stale_facts_or_missing_product_fail_query(self):
        self.ready()
        changed = copy.deepcopy(self.p)
        changed["title"] = "changed without a version"
        with self.assertRaisesRegex(CandidateUnavailable, "FACTS_STALE"):
            self.query([changed])

    def test_newer_update_becomes_queryable(self):
        self.ready()
        changed = copy.deepcopy(self.p)
        changed.update(entityVersion=self.p["entityVersion"] + 1, title="new")
        self.assertEqual(self.index.upsert([changed], [[0, 1]]), ["APPLIED"])
        self.assertEqual(self.query([changed]), [("101", 0.0)])

    def test_persisted_index_reopens_with_same_results(self):
        self.ready()
        other = VectorIndex(self.path, identity="test-only", dimension=2)
        try:
            self.assertEqual(other.query([1, 0], [self.p], identity="test-only"), self.query())
            self.assertEqual(other.logical_digest(), self.index.logical_digest())
        finally:
            other.close()

    def test_missing_model_artifacts_fail_before_optional_runtime_import(self):
        from services.m7_semantic.model import Encoder
        with self.assertRaisesRegex(CandidateUnavailable, "MODEL_ARTIFACT_MISMATCH"):
            Encoder(self.tmp.name, self.d).encode(["test"])

    def test_delete_tombstone_prevents_stale_resurrection(self):
        self.ready()
        version = self.p["entityVersion"] + 1
        self.assertEqual(self.index.delete("101", version), "APPLIED")
        self.assertEqual(self.index.delete("101", version), "IDEMPOTENT")
        self.assertEqual(self.index.upsert([self.p], [[1, 0]]), ["STALE_IGNORED"])
        with self.assertRaisesRegex(CandidateUnavailable, "FACTS_STALE"):
            self.query()

    def test_deleted_flag_and_down_status_create_tombstones(self):
        for changes in ({"deleted": True}, {"status": "SOLD"}):
            p = copy.deepcopy(self.p)
            p.update(**changes)
            self.index.rebuild([p], [[1, 0]])
            with self.assertRaisesRegex(CandidateUnavailable, "FACTS_STALE"):
                self.query()

    def test_vector_dimension_zero_and_nonfinite_rejected(self):
        for vector in ([1], [0, 0], [float("inf"), 1]):
            with self.assertRaises(CandidateUnavailable):
                checked_vector(vector, 2)

    def test_document_preprocessing_excludes_raw_owner_and_normalizes_unicode(self):
        self.p["description"] = "ＡＢＣ\n  text"
        text = document_text(self.p, self.d)
        self.assertIn("ABC text", text)
        self.assertNotIn(self.p["ownerId"], text)
        self.assertEqual(normalize(" Ａ\n B "), "A B")


if __name__ == "__main__":
    unittest.main()
