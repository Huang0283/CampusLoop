"""Mixed-language display must translate prose without changing model identifiers."""

import unittest
from collections import OrderedDict
from unittest.mock import patch

from services import catalog_translation_server as service


class MixedTranslationTests(unittest.TestCase):
    def test_mixed_description_translates_english_without_rewriting_chinese(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "model", side_effect=AssertionError("Reviewed phrases need no model")
        ):
            value = service.translate(["Nike 蓝色背包，charger included"], "zh")[0]
        self.assertIn("Nike", value)
        self.assertIn("蓝色背包", value)
        self.assertIn("含充电器", value)
        self.assertNotIn("charger", value)

    def test_model_identifiers_are_preserved_in_english_descriptions(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "model", side_effect=AssertionError("Reviewed phrases need no model")
        ):
            value = service.translate(["MacBook Pro M3 Pro 18GB 512GB SSD charger included"], "zh")[0]
        for token in ["MacBook Pro", "M3 Pro", "18GB", "512GB", "SSD"]:
            self.assertIn(token, value)
        self.assertIn("含充电器", value)

    def test_chinese_prose_and_brand_remain_correct_when_switched_to_english(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "model", side_effect=AssertionError("Reviewed phrases need no model")
        ):
            value = service.translate(["MacBook Pro M3 Pro 18GB 含充电器"], "en")[0]
        self.assertIn("MacBook Pro M3 Pro 18GB", value)
        self.assertIn("charger included", value)
        self.assertNotIn("含充电器", value)

    def test_audit_identifier_is_preserved_while_the_product_is_translated(self):
        prefix = "[t1-business-run2/CP400] "
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "model", side_effect=AssertionError("Reviewed phrases need no model")
        ):
            value = service.translate([prefix + "含充电器"], "en")[0]
        self.assertEqual(value, prefix + "charger included")


if __name__ == "__main__":
    unittest.main()
