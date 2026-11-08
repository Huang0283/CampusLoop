import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from services.m7_semantic import verify as semantic
from services.intelligence_phase4 import verify as joint


class ReviewArchivePropagationTests(unittest.TestCase):
    def test_semantic_evaluations_and_baseline_use_the_same_review_archive(self):
        archive = Path('reviewed-labels').resolve()
        steps = dict(semantic.build_steps(Path('output'), Path('model'), archive))
        for name in ('phase2-phase3-regression', 'evaluation', 'evaluation-repeat'):
            command = steps[name]
            self.assertEqual(command[command.index('--review-archive') + 1], str(archive))

    def test_joint_passes_the_review_archive_to_both_profiles(self):
        archive = Path('reviewed-labels').resolve()
        steps = dict(joint.build_steps(Path('output'), 'test-commit', Path('model'), archive))
        for name in ('m7-baseline', 'm7-model-reproduction'):
            command = steps[name]
            self.assertEqual(command[command.index('--review-archive') + 1], str(archive))

    def test_explicit_draft_mode_preserves_historical_behavior(self):
        for _, command in semantic.build_steps(Path('output'), Path('model')):
            self.assertNotIn('--review-archive', command)
        for _, command in joint.build_steps(Path('output'), 'test-commit'):
            self.assertNotIn('--review-archive', command)

    def test_review_manifest_is_part_of_semantic_source_fingerprint(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory)
            for name in ('manifest.json', 'review-records.csv', 'labels.reviewed.jsonl', 'review-check.json'):
                (archive / name).write_text('first', encoding='utf-8')
            before = semantic.review_hashes(archive)
            (archive / 'labels.reviewed.jsonl').write_text('changed', encoding='utf-8')
            self.assertNotEqual(before, semantic.review_hashes(archive))
            self.assertEqual(len(before), 4)

    def test_dependency_evidence_does_not_require_pip_in_the_runtime(self):
        installed = [SimpleNamespace(metadata={'Name': 'torch'}, version='2.8.0+cpu'),
                     SimpleNamespace(metadata={'Name': 'jsonschema'}, version='4.26.0')]
        with patch.object(semantic, 'distributions', return_value=installed), \
                patch.object(semantic.subprocess, 'run', side_effect=AssertionError('pip is absent')):
            self.assertEqual(semantic.dependency_snapshot(), 'jsonschema==4.26.0\ntorch==2.8.0+cpu\n')


if __name__ == '__main__':
    unittest.main()
