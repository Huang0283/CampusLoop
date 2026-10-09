import copy
import json
import tempfile
import unittest
from pathlib import Path

import pipeline


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.register = pipeline.read_json(pipeline.RAW / "source-register.json")
        cls.sources = pipeline.validate_sources(cls.register)
        cls.row = pipeline.read_jsonl(pipeline.RAW / "price-samples.jsonl")[0]

    def test_build_is_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            first = pipeline.build(derived_dir=target)
            hashes1 = {p.name: pipeline.sha256(p) for p in target.iterdir()}
            second = pipeline.build(derived_dir=target)
            hashes2 = {p.name: pipeline.sha256(p) for p in target.iterdir()}
            self.assertEqual(first, second)
            self.assertEqual(hashes1, hashes2)

    def test_listing_price_is_not_a_transaction_label(self):
        row = copy.deepcopy(self.row)
        row["listingPriceFen"] = 1
        row["transactionPriceFen"] = None
        pipeline.validate_row(row, self.sources, set())

    def test_non_l3_transaction_label_fails(self):
        row = copy.deepcopy(self.row)
        row["transactionPriceFen"] = 500
        with self.assertRaisesRegex(pipeline.DataError, "non-L3"):
            pipeline.validate_row(row, self.sources, set())

    def test_l3_requires_completion(self):
        row = copy.deepcopy(self.row)
        row["labelLevel"] = "L3_COMPLETED_TRANSACTION"
        row["transactionPriceFen"] = 500
        with self.assertRaisesRegex(pipeline.DataError, "L3 requires"):
            pipeline.validate_row(row, self.sources, set())

    def test_unapproved_source_fails(self):
        row = copy.deepcopy(self.row)
        row.update(sourceId="PDS-05", sourceType="third_party", licenseStatus="unknown")
        with self.assertRaisesRegex(pipeline.DataError, "unapproved source"):
            pipeline.validate_row(row, self.sources, set())

    def test_duplicate_id_fails(self):
        with self.assertRaisesRegex(pipeline.DataError, "duplicate"):
            pipeline.validate_row(copy.deepcopy(self.row), self.sources, {self.row["sampleId"]})

    def test_unknown_field_fails(self):
        row = copy.deepcopy(self.row)
        row["email"] = "forbidden@example.test"
        with self.assertRaisesRegex(pipeline.DataError, "unknown fields"):
            pipeline.validate_row(row, self.sources, set())

    def test_missing_original_price_degrades(self):
        row = copy.deepcopy(self.row)
        row["originalPriceFen"] = None
        result = pipeline.advise(row)
        self.assertEqual(result["status"], "INSUFFICIENT_DATA")

    def test_advice_bounds_are_ordered(self):
        result = pipeline.advise(self.row)
        self.assertLessEqual(result["lowerFen"], result["recommendedFen"])
        self.assertLessEqual(result["recommendedFen"], result["upperFen"])


if __name__ == "__main__":
    unittest.main()
