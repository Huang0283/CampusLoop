"""Cache privacy checks do not load translation models."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services import catalog_translation_server as service


class TranslationCacheTests(unittest.TestCase):
    def test_legacy_purge_keeps_model_weights_and_unrelated_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ["translations-012345abcdef.sqlite3", "translations-012345abcdef.sqlite3-wal", "translations-v1.sqlite3"]:
                (root / name).write_text("private fixture", encoding="utf-8")
            model = root / "models"
            model.mkdir()
            (model / "weights.bin").write_bytes(b"model")
            (root / "unrelated.sqlite3").write_bytes(b"keep")
            with patch.object(service, "CACHE", root):
                service.purge_legacy_cache()
                service.purge_legacy_cache()
            self.assertEqual(list(root.glob("translations-*")), [])
            self.assertEqual((model / "weights.bin").read_bytes(), b"model")
            self.assertTrue((root / "unrelated.sqlite3").exists())

    def test_memory_cache_is_bounded(self):
        with patch.object(service, "MAX_TRANSLATIONS", 2), patch.object(service, "translations", service.OrderedDict()):
            for text in ("one", "two", "three"):
                service.remember(text, "en", text)
            self.assertEqual(list(service.translations), [("two", "en"), ("three", "en")])


if __name__ == "__main__":
    unittest.main()
