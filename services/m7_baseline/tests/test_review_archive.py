import csv
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from services.m7_baseline.engine import ROOT
from services.m7_baseline.evaluate import evaluate_fixed


class ReviewArchiveTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.folder = Path(self.directory.name)
        with (ROOT / 'data/m7-phase2/derived/review-queue.csv').open(encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            self.columns = reader.fieldnames
            self.rows = list(reader)

    def write_sheet(self, complete=True):
        if complete:
            for row in self.rows:
                row.update(reviewer='fixture-only:reviewer', reviewLabel=row['candidateLabel'],
                           reviewReason='Automated test fixture only; not real human approval.',
                           reviewedAt='2026-10-08T09:00:00+08:00')
        path = self.folder / 'sheet.csv'
        with path.open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=self.columns)
            writer.writeheader()
            writer.writerows(self.rows)
        return path

    def test_default_evaluation_exposes_pending_provenance(self):
        result = evaluate_fixed()
        self.assertEqual(result['labelSource'], 'PENDING_HUMAN_REVIEW')
        self.assertEqual(result['humanReviewedPairs'], 0)
        self.assertEqual(result['labelReview']['status'], 'STRUCTURED_RECORDS_PENDING')
        self.assertIsNone(result['labelReview']['archiveManifestSha256'])

    def test_valid_archive_updates_evaluation_without_claiming_sealed_approval(self):
        from services.m7_baseline.review_archive import archive_review_sheet
        before = (ROOT / 'data/m7-phase2/derived/labels.draft.jsonl').read_bytes()
        folder = self.folder / 'archive'
        archive_review_sheet(self.write_sheet(), folder, 'fixture-reviewed-v1')
        result = evaluate_fixed(review_archive=folder)
        self.assertEqual(result['humanReviewedPairs'], 228)
        self.assertEqual(result['labelSource'], 'HUMAN_REVIEWED_UNSEALED')
        self.assertEqual(result['labelReview']['status'], 'HUMAN_REVIEWED_UNSEALED')
        self.assertTrue(result['labelReview']['archiveManifestSha256'])
        self.assertFalse(result['labelReview']['testSetSealed'])
        self.assertEqual(result['envelopes']['all']['labelVersion'], 'fixture-reviewed-v1')
        self.assertEqual(result['metrics']['all']['metadata']['labelSource'], 'HUMAN_REVIEWED_UNSEALED')
        self.assertEqual(result['status'], 'DIAGNOSTIC_ONLY')
        self.assertFalse(result['metrics']['all']['modelEffectEvaluated'])
        self.assertEqual(before, (ROOT / 'data/m7-phase2/derived/labels.draft.jsonl').read_bytes())

    def test_blank_sheet_reports_missing_fields_and_creates_no_archive(self):
        from services.m7_baseline.review_archive import archive_review_sheet, inspect_review_sheet
        sheet = self.write_sheet(complete=False)
        check = inspect_review_sheet(sheet)
        self.assertEqual(check['verifiedStructuredRecords'], 0)
        self.assertFalse(check['readyToArchive'])
        self.assertTrue(check['errors'])
        folder = self.folder / 'archive'
        with self.assertRaises(ValueError):
            archive_review_sheet(sheet, folder, 'fixture-reviewed-v1')
        self.assertFalse(folder.exists())

    def test_duplicate_and_missing_ids_fail(self):
        from services.m7_baseline.review_archive import inspect_review_sheet
        self.rows[-1] = self.rows[0].copy()
        check = inspect_review_sheet(self.write_sheet())
        self.assertFalse(check['readyToArchive'])
        self.assertTrue(check['missingLabelIds'])
        self.assertTrue(check['duplicateLabelIds'])

    def test_timezone_and_dispute_resolution_are_required(self):
        from services.m7_baseline.review_archive import inspect_review_sheet
        sheet = self.write_sheet()
        self.rows[0]['reviewedAt'] = '2026-10-08'
        self.rows[1]['dispute'] = 'yes'
        sheet = self.write_sheet(complete=False)
        check = inspect_review_sheet(sheet)
        self.assertFalse(check['readyToArchive'])
        self.assertTrue(any('reviewedAt' in e for e in check['errors']))
        self.assertTrue(any('adjudicator' in e for e in check['errors']))

    def test_label_differences_are_reported_and_not_silently_promoted(self):
        from services.m7_baseline.review_archive import inspect_review_sheet
        self.write_sheet()
        self.rows[0]['reviewLabel'] = '0'
        check = inspect_review_sheet(self.write_sheet(complete=False))
        self.assertFalse(check['readyToArchive'])
        self.assertEqual(check['labelDifferences'][0]['labelId'], self.rows[0]['labelId'])

    def test_tampered_archive_fails_even_when_file_hash_is_rewritten(self):
        from services.m7_baseline.review_archive import archive_review_sheet
        folder = self.folder / 'archive'
        archive_review_sheet(self.write_sheet(), folder, 'fixture-reviewed-v1')
        labels = folder / 'labels.reviewed.jsonl'
        values = [json.loads(line) for line in labels.read_text(encoding='utf-8').splitlines()]
        values[0]['reviewer'] = 'tampered'
        labels.write_text(''.join(json.dumps(row) + '\n' for row in values), encoding='utf-8')
        path = folder / 'manifest.json'
        manifest = json.loads(path.read_text(encoding='utf-8'))
        manifest['files']['labels.reviewed.jsonl'] = hashlib.sha256(labels.read_bytes()).hexdigest()
        path.write_text(json.dumps(manifest), encoding='utf-8')
        with self.assertRaises(ValueError):
            evaluate_fixed(review_archive=folder)

    def test_draft_version_and_nonempty_output_are_rejected(self):
        from services.m7_baseline.review_archive import archive_review_sheet
        sheet = self.write_sheet()
        with self.assertRaises(ValueError):
            archive_review_sheet(sheet, self.folder / 'archive', 'm7-label-draft-v1')
        with self.assertRaises(ValueError):
            archive_review_sheet(sheet, self.folder, 'fixture-reviewed-v1')
