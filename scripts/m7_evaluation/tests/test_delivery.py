"""Check distributed evidence bytes and references, never approve human claims."""

import hashlib
import json
from pathlib import Path
import unittest


EVIDENCE = Path(__file__).resolve().parents[3] / "docs/evidence/m7-evaluation"


class DeliveryTests(unittest.TestCase):
    def test_distributed_files_match_their_integrity_manifests(self):
        manifests = list(EVIDENCE.rglob("FILES.sha256.json"))
        self.assertTrue(manifests, "no delivery manifests found")
        for manifest in manifests:
            entries = json.loads(manifest.read_text(encoding="utf-8-sig"))
            self.assertTrue(entries, str(manifest))
            for name, expected in entries.items():
                with self.subTest(manifest=manifest.parent.name, file=name):
                    target = (manifest.parent / name).resolve()
                    self.assertTrue(target.is_relative_to(manifest.parent.resolve()))
                    self.assertTrue(target.is_file(), f"missing distributed file: {name}")
                    self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), expected)

    def test_review_evidence_points_to_existing_local_confirmation_sections(self):
        references = set()
        for directory in ("m7-review-confirmation-20261021", "review-time-supplement-20261021"):
            for record in (EVIDENCE / directory).glob("M7_*.jsonl"):
                for line in record.read_text(encoding="utf-8-sig").splitlines():
                    if line.strip():
                        references.add((record.parent, json.loads(line)["evidence"]))
        self.assertTrue(references, "no confirmation references found")
        for parent, reference in references:
            with self.subTest(directory=parent.name, reference=reference):
                filename, separator, fragment = reference.partition("#")
                target = parent / filename
                self.assertTrue(target.is_file())
                if separator:
                    headings = {
                        line.lstrip("#").strip()
                        for line in target.read_text(encoding="utf-8-sig").splitlines()
                        if line.startswith("#")
                    }
                    self.assertIn(fragment, headings, "review cites a deleted confirmation section")


if __name__ == "__main__":
    unittest.main()
