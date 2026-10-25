"""Replay M10's fixed formula; a successful command is never a signature."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkout', type=Path, required=True)
    parser.add_argument('--first', type=Path, required=True)
    parser.add_argument('--repeat', type=Path, required=True)
    parser.add_argument('--auditor', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--declared-executor', default='UNSIGNED_COMMAND_EXECUTION')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('output file must not exist')
    root = args.checkout.resolve()
    source = args.auditor.read_bytes().replace(b'\r\n', b'\n')
    pinned = subprocess.check_output(['git', 'show', '1cc5cbf7633017ea69560cc2f43e0e308658b1da:scripts/quality_phase4/archive_evaluation.py'], cwd=root).replace(b'\r\n', b'\n')
    if source != pinned:
        parser.error('auditor differs from pinned original M10 source')
    spec = importlib.util.spec_from_file_location('fixed_m10_formula', args.auditor)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    def read(path):
        return json.loads(path.read_text(encoding='utf-8'))
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    status = read(args.first/'evaluation-status.json')
    assert status['codeCommit'] == read(args.repeat/'evaluation-status.json')['codeCommit'] == head
    for relative, expected in status['sourceHashes'].items():
        assert hashlib.sha256((root/relative).read_bytes()).hexdigest() == expected, relative
    checks = {}
    for split in ('all', 'dev', 'test_candidate'):
        document = read(args.first/f'evaluation-input-{split}.json')
        reported = read(args.first/f'metrics-{split}.json')
        module.strict_check(document, reported)
        assert document == read(args.repeat/f'evaluation-input-{split}.json')
        assert reported == read(args.repeat/f'metrics-{split}.json')
        checks[split] = dict(requests=len(document['requests']), tolerance=1e-12, repeatedMetricsIdentical=True)
    record = dict(status='PASS', sourceCommit=head, auditorSourceCommit='1cc5cbf7633017ea69560cc2f43e0e308658b1da',
                  auditorNormalizedSha256=hashlib.sha256(source).hexdigest(), checks=checks,
                  declaredExecutor=args.declared_executor, formalAcceptance=False, signature=None,
                  interpretation='independent formula implementation; execution identity and final acceptance require original responsible reviewer')
    args.output.write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps(dict(status='PASS', formalAcceptance=False)))


if __name__ == '__main__':
    main()
