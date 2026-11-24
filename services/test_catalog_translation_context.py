"""Unknown listings keep whole-sentence context and restore protected facts exactly."""

import json
import unittest
from collections import OrderedDict
from pathlib import Path
from unittest.mock import patch

from services import catalog_translation_server as service


class ContextTranslationTests(unittest.TestCase):
    def test_quality_holdouts_are_not_full_title_dictionary_entries(self):
        path = Path(__file__).with_name("catalog_translation_quality_cases.json")
        cases = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(len({row["id"] for row in cases}), len(cases))
        self.assertGreaterEqual(len(cases), 12)
        for case in cases:
            self.assertNotIn(case["source"], service.GLOSSARY)
            self.assertNotIn(case["source"], service.GLOSSARY.values())

    def test_negations_and_ambiguous_nouns_are_not_replaced_as_substrings(self):
        for source, target in [
            ("鼠标滚轮失灵，不含充电器，不议价。", "en"),
            ("折叠阅读支架，底部有一处浅划痕", "en"),
            ("Mouse has a faulty scroll wheel. No charger included. Price is firm.", "zh"),
            ("Two ceramic mugs with matching lids, campus pickup only", "zh"),
        ]:
            with self.subTest(source=source), patch.object(service, "translations", OrderedDict()), patch.object(
                service, "infer", return_value="校内测试译文" if target == "zh" else "Test translation"
            ) as inference:
                service.translate([source], target)
                inference.assert_called_once_with(source, target)

    def test_brand_model_numbers_and_existing_chinese_are_restored_exactly(self):
        source = "Nike 蓝色背包，17cm；handmade pouch supplied，外观完整"
        with patch.object(service, "infer", side_effect=lambda text, _, facts=None: text.replace("handmade pouch supplied", "附手工收纳袋")):
            result = service.translate_content(source, "zh")
        self.assertEqual(result, source.replace("handmade pouch supplied", "附手工收纳袋"))

    def test_adjacent_brand_and_spec_spacing_is_preserved_as_one_fact(self):
        source = "Apple iPhone 13 128GB charger included"
        spans = service.display_spans(source, "zh")
        self.assertEqual(spans, [(0, len("Apple iPhone 13 128GB"), "Apple iPhone 13 128GB")])
        with patch.object(service, "infer", return_value="__KEEP_0__附充电器"):
            self.assertEqual(service.translate_content(source, "zh"), "Apple iPhone 13 128GB附充电器")

    def test_missing_duplicate_or_invented_marker_fails_closed(self):
        for output in ["附充电器", "__KEEP_0__ __KEEP_0__ 含充电器", "__KEEP_0__ __KEEP_999__ 含充电器"]:
            with self.subTest(output=output), patch.object(service, "infer", return_value=output):
                with self.assertRaisesRegex(ValueError, "protected source fact"):
                    service.translate_content("Sony charger included", "zh")

    def test_literal_copy_next_to_a_marker_cannot_duplicate_a_brand(self):
        with patch.object(service, "infer", return_value="Sony __KEEP_0__ 附充电器"):
            with self.assertRaisesRegex(ValueError, "repeated a protected source fact"):
                service.translate_content("Sony charger included", "zh")

    def test_marker_like_user_text_cannot_overwrite_restoration(self):
        source = "__KEEP_0__ Sony charger included"
        with patch.object(service, "infer", side_effect=lambda text, _, facts=None: text.replace("charger included", "附充电器")):
            self.assertEqual(service.translate_content(source, "zh"), source.replace("charger included", "附充电器"))

    def test_edit_uses_new_source_and_does_not_reuse_old_translation(self):
        with patch.object(service, "translations", OrderedDict()), patch.object(service, "infer", side_effect=["含收纳袋", "不含收纳袋"]) as inference:
            self.assertEqual(service.translate(["Storage pouch included"], "zh"), ["含收纳袋"])
            self.assertEqual(service.translate(["No storage pouch included"], "zh"), ["不含收纳袋"])
            self.assertEqual(service.translate(["Storage pouch included"], "zh"), ["含收纳袋"])
            self.assertEqual(inference.call_count, 2)


if __name__ == "__main__":
    unittest.main()
