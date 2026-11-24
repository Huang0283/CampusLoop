"""Mixed-language display must translate prose without changing model identifiers."""

import unittest
from collections import OrderedDict
from unittest.mock import patch

from services import catalog_translation_server as service


class MixedTranslationTests(unittest.TestCase):
    def test_original_chinese_cosplay_listings_survive_language_roundtrip(self):
        titles = [
            "蓝金色Cosplay道具剑（柄部有瑕疵）",
            "浅紫色缠花Cosplay发饰一组",
            "粉蓝色蝴蝶结Cosplay道具叉",
            "Cosplay造型肩垫 单件",
            "自制Cosplay配件，PVC材质，长35cm",
        ]
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "model", side_effect=AssertionError("Original Chinese must remain intact")
        ):
            for title in titles:
                self.assertEqual(service.translate([title], "zh"), [title])
            for title in titles[:4]:
                english = service.translate([title], "en")[0]
                self.assertEqual(english, service.GLOSSARY[title])
                self.assertEqual(service.translate([english], "zh"), [title])
                self.assertEqual(service.translate([title], "zh"), [title])

    def test_unreviewed_english_never_sends_existing_chinese_to_model(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "infer", side_effect=lambda text, _, facts=None: text.replace("handmade storage pouch supplied", "附带手工制作的收纳袋")
        ) as inference:
            result = service.translate(["苹果蓝色背包，handmade storage pouch supplied。瑕疵已说明"], "zh")[0]
        self.assertEqual(result, "苹果蓝色背包，附带手工制作的收纳袋。瑕疵已说明")
        for call in inference.call_args_list:
            self.assertNotRegex(call.args[0], r"[\u3400-\u9fff]")

    def test_mixed_description_translates_english_without_rewriting_chinese(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "infer", side_effect=lambda text, _, facts=None: text.replace("charger included", "含充电器")
        ):
            value = service.translate(["Nike 蓝色背包，charger included"], "zh")[0]
        self.assertIn("Nike", value)
        self.assertIn("蓝色背包", value)
        self.assertIn("含充电器", value)
        self.assertNotIn("charger", value)

    def test_model_identifiers_are_preserved_in_english_descriptions(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "infer", side_effect=lambda text, _, facts=None: text.replace("charger included", "含充电器")
        ):
            value = service.translate(["MacBook Pro M3 Pro 18GB 512GB SSD charger included"], "zh")[0]
        for token in ["MacBook Pro", "M3 Pro", "18GB", "512GB", "SSD"]:
            self.assertIn(token, value)
        self.assertIn("含充电器", value)

    def test_chinese_prose_and_brand_remain_correct_when_switched_to_english(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(
            service, "infer", side_effect=lambda text, _, facts=None: text.replace("含充电器", "charger included")
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
