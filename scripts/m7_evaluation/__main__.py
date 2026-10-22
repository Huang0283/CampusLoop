"""No network access and no deployment: member evidence is never auto-created."""
import argparse
import json
from pathlib import Path
from .protocol import (BundleError, create_template, inspect_bundle, seal_bundle,
                       run_snapshot, prepare_reviews, merge_reviews)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    init = commands.add_parser('init', help='create an empty member collection directory')
    init.add_argument('--output', type=Path, required=True)
    check = commands.add_parser('check', help='inspect source data; exit 2 if incomplete')
    check.add_argument('--bundle', type=Path, required=True)
    packets = commands.add_parser('prepare-reviews', help='make two blank blind peer-review sheets')
    packets.add_argument('--bundle', type=Path, required=True)
    packets.add_argument('--output', type=Path, required=True)
    merge = commands.add_parser('merge-reviews', help='combine actual reviews without guessing disagreements')
    merge.add_argument('--bundle', type=Path, required=True)
    merge.add_argument('--first', type=Path, required=True)
    merge.add_argument('--second', type=Path, required=True)
    merge.add_argument('--output', type=Path, required=True)
    seal = commands.add_parser('seal', help='copy valid reviewed inputs into a new immutable-by-hash snapshot')
    seal.add_argument('--bundle', type=Path, required=True)
    seal.add_argument('--output', type=Path, required=True)
    run = commands.add_parser('run', help='replay test queries only after freeze validation')
    run.add_argument('--snapshot', type=Path, required=True)
    run.add_argument('--output', type=Path, required=True)
    run.add_argument('--model-dir', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.action == 'init':
            create_template(args.output)
            report = dict(status='EMPTY_COLLECTION_TEMPLATE', formalAcceptance=False)
        elif args.action == 'check':
            report = inspect_bundle(args.bundle)
        elif args.action == 'prepare-reviews':
            report = prepare_reviews(args.bundle, args.output)
        elif args.action == 'merge-reviews':
            report = merge_reviews(args.bundle, args.first, args.second, args.output)
        elif args.action == 'seal':
            report = seal_bundle(args.bundle, args.output)
        else:
            report = run_snapshot(args.snapshot, args.output, model_dir=args.model_dir)
    except (BundleError, OSError) as exc:
        report = dict(status='REFUSED', formalAcceptance=False, error=str(exc))
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 2 if args.action == 'check' and not report['readyToSeal'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
