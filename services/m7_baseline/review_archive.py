"""Validate and archive unchanged-label review records, without sealing a benchmark."""
import argparse
import copy
import csv
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import re

from .engine import ROOT


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source():
    data = ROOT / 'data/m7-phase2/derived'
    manifest = json.loads((data / 'manifest.json').read_text(encoding='utf-8'))
    path = data / 'labels.draft.jsonl'
    if digest(path) != manifest['derivedHashes']['labels.draft.jsonl']:
        raise ValueError('draft label hash mismatch')
    labels = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]
    return manifest, labels, digest(path)


def timestamp(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return 'T' in value and parsed.utcoffset() is not None
    except (ValueError, TypeError):
        return False


def _inspect(path):
    manifest, labels, source_hash = source()
    original = {row['labelId']: row for row in labels}
    sheet_bytes = Path(path).read_bytes()
    with io.StringIO(sheet_bytes.decode('utf-8-sig'), newline='') as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        if len(columns) != len(set(columns)):
            raise ValueError('duplicate CSV column')
        grade_column = 'reviewLabel' if 'reviewLabel' in columns else 'reviewLabel(2/1/0/U)'
        required = {'labelId', 'reviewer', grade_column, 'reviewReason', 'reviewedAt',
                    'dispute', 'adjudicator', 'finalLabel', 'adjudicatedAt'}
        if not required <= set(columns):
            raise ValueError('missing CSV columns: ' + ', '.join(sorted(required - set(columns))))
        rows = list(reader)
    errors, normalized, differences, seen, duplicates = [], {}, [], set(), set()
    for row in rows:
        if None in row or any(value is None for value in row.values()):
            errors.append('malformed CSV row')
            continue
        rid = row['labelId'].strip()
        if rid in seen:
            duplicates.add(rid)
        seen.add(rid)
        if rid not in original:
            errors.append(rid + ': unknown labelId')
            continue
        start = len(errors)
        values = {name: row[name].strip() for name in required}
        for name in ('reviewer', 'reviewReason'):
            if not values[name]:
                errors.append(rid + ': ' + name + ' required')
        if values[grade_column] not in {'0', '1', '2', 'U'}:
            errors.append(rid + ': reviewLabel must be 0/1/2/U')
        if not timestamp(values['reviewedAt']):
            errors.append(rid + ': reviewedAt requires ISO timestamp with timezone')
        dispute = values['dispute'].casefold() not in {'', '0', 'false', 'no', 'none', '否', '无'}
        adjudicated = dispute or bool(values['adjudicator'] or values['adjudicatedAt'])
        if adjudicated:
            if not values['adjudicator']:
                errors.append(rid + ': adjudicator required for dispute/resolution')
            if values['finalLabel'] not in {'0', '1', '2', 'U'}:
                errors.append(rid + ': finalLabel required for dispute/resolution')
            if not timestamp(values['adjudicatedAt']):
                errors.append(rid + ': adjudicatedAt requires ISO timestamp with timezone')
            if timestamp(values['reviewedAt']) and timestamp(values['adjudicatedAt']):
                if datetime.fromisoformat(values['adjudicatedAt'].replace('Z', '+00:00')) < datetime.fromisoformat(values['reviewedAt'].replace('Z', '+00:00')):
                    errors.append(rid + ': adjudication predates review')
        elif values['finalLabel'] and values['finalLabel'] != values[grade_column]:
            errors.append(rid + ': differing finalLabel requires adjudication')
        final = values['finalLabel'] if adjudicated else values[grade_column]
        if final in {'0', '1', '2', 'U'} and final != str(original[rid]['label']):
            differences.append(dict(labelId=rid, candidateLabel=original[rid]['label'], finalLabel=final))
        if len(errors) == start:
            normalized[rid] = dict(reviewer=values['reviewer'], reviewLabel=values[grade_column],
                reviewReason=values['reviewReason'], reviewedAt=values['reviewedAt'], dispute=dispute,
                adjudicator=values['adjudicator'] if adjudicated else None,
                adjudicatedAt=values['adjudicatedAt'] if adjudicated else None, finalLabel=final)
    missing = sorted(set(original) - seen)
    unknown = sorted(seen - set(original))
    if missing or unknown or duplicates or len(rows) != len(original):
        errors.append('CSV must cover each original labelId exactly once')
    if differences:
        errors.append('label differences require separate adjudication/data revision; this archive preserves original labels')
    report = dict(datasetVersion=manifest['datasetVersion'], sourceLabelVersion=manifest['labelVersion'],
                  sourceLabelSha256=source_hash, reviewSheetSha256=hashlib.sha256(sheet_bytes).hexdigest(), pairCount=len(original),
                  receivedRows=len(rows), verifiedStructuredRecords=len(normalized),
                  missingLabelIds=missing, unknownLabelIds=unknown, duplicateLabelIds=sorted(duplicates),
                  labelDifferences=differences, errors=errors, readyToArchive=not errors)
    return report, normalized, labels


def inspect_review_sheet(path):
    return _inspect(path)[0]


def reviewed_labels(original, records, version):
    labels = copy.deepcopy(original)
    for label in labels:
        record = records[label['labelId']]
        label.update(labelVersion=version, reviewer=record['reviewer'], reviewedAt=record['reviewedAt'],
                     reviewReason=record['reviewReason'], adjudicator=record['adjudicator'],
                     adjudicatedAt=record['adjudicatedAt'], reviewStatus='human_reviewed_recorded')
    return labels


def validate_version(version, original):
    if not isinstance(version, str) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._-]{2,127}', version) or version == original:
        raise ValueError('new, distinct labelVersion required')


def archive_review_sheet(sheet, output, label_version):
    sheet, output = Path(sheet), Path(output).resolve()
    report, records, labels = _inspect(sheet)
    validate_version(label_version, report['sourceLabelVersion'])
    if not report['readyToArchive']:
        raise ValueError('review sheet is not ready: ' + '; '.join(report['errors'][:5]))
    for protected in ('data', 'schemas', 'contracts'):
        if output.is_relative_to((ROOT / protected).resolve()):
            raise ValueError('archive must not overwrite versioned source assets')
    if output.exists() and any(output.iterdir()):
        raise ValueError('archive output directory must be empty')
    sheet_bytes = sheet.read_bytes()
    if hashlib.sha256(sheet_bytes).hexdigest() != report['reviewSheetSha256']:
        raise ValueError('review sheet changed during validation')
    output.mkdir(parents=True, exist_ok=True)
    def write(name, value):
        (output / name).write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8', newline='\n')
    (output / 'review-records.csv').write_bytes(sheet_bytes)
    (output / 'labels.reviewed.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False, sort_keys=True) + '\n'
        for row in reviewed_labels(labels, records, label_version)), encoding='utf-8', newline='\n')
    write('review-check.json', report)
    manifest = dict(schemaVersion='m7-review-archive-v1', status='HUMAN_REVIEWED_UNSEALED',
        datasetVersion=report['datasetVersion'], sourceLabelVersion=report['sourceLabelVersion'],
        sourceLabelSha256=report['sourceLabelSha256'], labelVersion=label_version,
        pairCount=len(labels), humanReviewedPairs=len(records), testSetSealed=False,
        files={name: digest(output / name) for name in ('review-records.csv', 'labels.reviewed.jsonl', 'review-check.json')})
    write('manifest.json', manifest)
    return manifest


def load_review_archive(folder):
    folder = Path(folder)
    path = folder / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    expected = {'schemaVersion', 'status', 'datasetVersion', 'sourceLabelVersion', 'sourceLabelSha256',
                'labelVersion', 'pairCount', 'humanReviewedPairs', 'testSetSealed', 'files'}
    if (not isinstance(manifest, dict) or set(manifest) != expected or manifest['schemaVersion'] != 'm7-review-archive-v1'
            or manifest['status'] != 'HUMAN_REVIEWED_UNSEALED' or manifest['testSetSealed'] is not False
            or not isinstance(manifest['files'], dict)
            or set(manifest['files']) != {'review-records.csv', 'labels.reviewed.jsonl', 'review-check.json'}):
        raise ValueError('unsupported/unsealed review archive manifest required')
    for name, value in manifest['files'].items():
        if digest(folder / name) != value:
            raise ValueError('review archive hash mismatch: ' + name)
    report, records, original = _inspect(folder / 'review-records.csv')
    if not report['readyToArchive']:
        raise ValueError('archived review records are incomplete')
    for name in ('datasetVersion', 'sourceLabelVersion', 'sourceLabelSha256'):
        if manifest[name] != report[name]:
            raise ValueError('review archive source mismatch: ' + name)
    if manifest['pairCount'] != len(original) or manifest['humanReviewedPairs'] != len(records):
        raise ValueError('review archive count mismatch')
    validate_version(manifest['labelVersion'], report['sourceLabelVersion'])
    check = json.loads((folder / 'review-check.json').read_text(encoding='utf-8'))
    labels = [json.loads(line) for line in (folder / 'labels.reviewed.jsonl').read_text(encoding='utf-8').splitlines()]
    if check != report or labels != reviewed_labels(original, records, manifest['labelVersion']):
        raise ValueError('reviewed labels/check do not match original labels and CSV records')
    return labels, dict(status=manifest['status'], labelSource=manifest['status'],
                       labelVersion=manifest['labelVersion'], humanReviewedPairs=len(records),
                       testSetSealed=False, archiveManifestSha256=digest(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review-sheet', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--label-version')
    args = parser.parse_args()
    try:
        if args.check_only:
            result = inspect_review_sheet(args.review_sheet)
            print(json.dumps(result, ensure_ascii=True, sort_keys=True))
            return 0 if result['readyToArchive'] else 2
        if not args.output_dir or not args.label_version:
            parser.error('archiving requires --output-dir and --label-version')
        print(json.dumps(archive_review_sheet(args.review_sheet, args.output_dir, args.label_version), ensure_ascii=True, sort_keys=True))
        return 0
    except (ValueError, OSError) as exc:
        print(json.dumps(dict(status='REVIEW_ARCHIVE_REJECTED', error=str(exc)), ensure_ascii=True))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
