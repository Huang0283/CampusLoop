"""External human-authored evaluation: inspect -> seal -> replay, never auto-accept.

Receipts and reviewer names are declarations to be independently verified, not
authentication. No labels, dates, member signatures or approvals are generated.
"""
import copy
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import shutil
import subprocess
import time
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
GATES = ROOT / 'contracts/intelligence-phase2/model-gates.candidate.json'
FILES = ('products.jsonl', 'requests.jsonl', 'annotations.jsonl', 'sources.json',
         'dictionary.json', 'splits.json', 'policy.json')
POLICY_KEYS = {'schemaVersion', 'datasetVersion', 'labelVersion', 'evidenceScope',
               'goLivePolicySha256', 'criticalSlices', 'approvals', 'catalogSourceId',
               'testExposure', 'exposureEvidence'}
TASKS = {'search': 'semantic-search', 'matching': 'supply-demand-matching'}


class BundleError(ValueError):
    pass


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                   indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


def rows(path):
    return [json.loads(line) for line in Path(path).read_text(encoding='utf-8-sig').splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def policy_fingerprint():
    return sha(GATES)


def thresholds():
    policy = read(GATES)
    return {task: next(c for c in policy['capabilities'] if c['capability'] == capability)
            for task, capability in TASKS.items()}


def _time(value):
    if not isinstance(value, str) or 'T' not in value:
        raise ValueError('timestamp requires time and timezone')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.utcoffset() is None:
        raise ValueError('timestamp requires timezone')
    return parsed


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _evidence_time(value):
    when = _time(value)
    if when > datetime.now(timezone.utc):
        raise ValueError('human evidence time may not be in the future')
    return when


def _label(value):
    return type(value) is int and value in (0, 1, 2) or value == 'U'


def create_template(root):
    """Empty human collection inputs; only the existing dictionary is copied."""
    root = Path(root)
    if root.exists():
        raise BundleError('template destination must not exist')
    root.mkdir(parents=True)
    for name in ('products.jsonl', 'requests.jsonl', 'annotations.jsonl'):
        (root / name).write_bytes(b'')
    write(root / 'sources.json', [])
    write(root / 'dictionary.json', read(ROOT / 'data/m7-phase2/raw/dictionary.json'))
    write(root / 'splits.json', {'dev': [], 'test': []})
    write(root / 'policy.json', dict(schemaVersion='m7-external-evaluation-v1',
          datasetVersion='', labelVersion='', evidenceScope='HUMAN_CONSTRUCTED_SCENARIOS_ONLY',
          goLivePolicySha256=policy_fingerprint(), criticalSlices=[], approvals={'M1': None, 'M10': None},
          catalogSourceId='', testExposure='PENDING_MEMBER_DECLARATION', exposureEvidence=''))


def _load(root):
    root = Path(root).resolve()
    for name in FILES:
        path = root / name
        if not path.is_file() or path.is_symlink() or path.resolve().parent != root:
            raise BundleError('missing or unsafe bundle file: ' + name)
    try:
        return {name: rows(root / name) if name.endswith('.jsonl') else read(root / name) for name in FILES}
    except (ValueError, OSError) as exc:
        raise BundleError('invalid bundle JSON: ' + str(exc)) from exc


def _final_label(annotation):
    reviews = annotation['reviews']
    if reviews[0]['label'] == reviews[1]['label']:
        return reviews[0]['label']
    return annotation['adjudication']['label']


def _pair_ids(data):
    from services.m7_baseline.engine import VALIDATORS, validate_inputs
    products, requests = data['products.jsonl'], data['requests.jsonl']
    if not products or not requests:
        raise BundleError('provide the product corpus and actual member-authored queries first')
    if any(not VALIDATORS['product'].is_valid(p) for p in products):
        raise BundleError('invalid product schema')
    ids = set()
    for entry in requests:
        request = entry['request']
        validate_inputs(products, request, data['dictionary.json'])
        if request['requestId'] in ids:
            raise BundleError('duplicate query ID')
        ids.add(request['requestId'])
    return {(r['request']['requestId'], p['productId']) for r in requests for p in products}


def prepare_reviews(source, destination):
    """Two blind sheets, no original labels, rankings, signatures or times."""
    data = _load(source)
    pairs = _pair_ids(data)
    destination = Path(destination)
    if destination.exists():
        raise BundleError('review packet output must be new')
    destination.mkdir(parents=True)
    for name in ('products.jsonl', 'requests.jsonl', 'dictionary.json'):
        shutil.copyfile(Path(source) / name, destination / name)
    for name in ('reviewer-A.jsonl', 'reviewer-B.jsonl'):
        with (destination / name).open('w', encoding='utf-8', newline='\n') as stream:
            for rid, pid in sorted(pairs):
                stream.write(json.dumps(dict(requestId=rid, productId=pid, reviewer='', reviewedAt='',
                                            label=None, reason='', evidence=''), ensure_ascii=False) + '\n')
    record = dict(status='BLIND_REVIEW_TEMPLATES_ONLY', pairCountPerReviewer=len(pairs),
                  structuredReviewsCompleted=0, formalAcceptance=False,
                  inputHashes={name: sha(Path(source) / name) for name in ('products.jsonl', 'requests.jsonl', 'dictionary.json')})
    write(destination / 'packet-info.json', record)
    return record


def merge_reviews(source, first, second, output):
    """Mechanical merge only: missing values/disagreements never guessed."""
    pairs = _pair_ids(_load(source))
    by_reviewer = []
    for path in (first, second):
        mapping = {}
        for row in rows(path):
            key = (row['requestId'], row['productId'])
            if key in mapping:
                raise BundleError('duplicate peer-review pair')
            if not _label(row.get('label')) or not all(_text(row.get(k)) for k in ('reviewer', 'reason', 'evidence')):
                raise BundleError('peer review is incomplete; no automatic backfill')
            _evidence_time(row.get('reviewedAt'))
            mapping[key] = {k: row[k] for k in ('reviewer', 'reviewedAt', 'label', 'reason', 'evidence')}
        if set(mapping) != pairs:
            raise BundleError('each peer must review the complete corpus pair set')
        by_reviewer.append(mapping)
    output = Path(output)
    if output.exists():
        raise BundleError('merged review output must be new')
    merged, disagreements = [], 0
    for key in sorted(pairs):
        reviews = [peer[key] for peer in by_reviewer]
        if reviews[0]['reviewer'].strip().casefold() == reviews[1]['reviewer'].strip().casefold():
            raise BundleError('two independent reviewers must be different people')
        disagreements += reviews[0]['label'] != reviews[1]['label']
        merged.append(dict(requestId=key[0], productId=key[1], reviews=reviews, adjudication=None))
    with output.open('w', encoding='utf-8', newline='\n') as stream:
        for row in merged:
            stream.write(json.dumps(row, ensure_ascii=False) + '\n')
    return dict(status='MERGED_NOT_SEALED', disagreementCount=disagreements, pairCount=len(merged), formalAcceptance=False,
                peerInputHashes=[sha(first), sha(second)])


def _inactive(request):
    wanted = request.get('wanted')
    return request.get('task') == 'matching' and wanted is not None and (
        wanted['status'] != 'OPEN' or _time(wanted['expiresAt']) <= _time(request['context']['asOf']))


def _effective(request):
    effective = copy.deepcopy(request)
    if effective['task'] == 'search':
        effective['context'].update(viewerId=None, campusId=None)
    return effective


def inspect_bundle(root):
    errors, warnings = [], []
    report = dict(status='NOT_READY', readyToSeal=False, formalAcceptance=False,
                  requestCounts={task: 0 for task in TASKS}, errors=errors, warnings=warnings)
    try:
        data = _load(root)
        products, requests, annotations = [data[n + '.jsonl'] for n in ('products', 'requests', 'annotations')]
        sources, splits, policy = [data[n + '.json'] for n in ('sources', 'splits', 'policy')]
        if not all(isinstance(x, list) for x in (products, requests, annotations, sources)):
            raise BundleError('products, requests, annotations and sources must be lists')
        if not isinstance(policy, dict) or set(policy) != POLICY_KEYS:
            raise BundleError('policy fields must match the fixed protocol; threshold overrides are forbidden')
        if policy['goLivePolicySha256'] != policy_fingerprint():
            errors.append('go-live policy hash differs from the committed original thresholds')
        if policy['schemaVersion'] != 'm7-external-evaluation-v1' or policy['evidenceScope'] != 'HUMAN_CONSTRUCTED_SCENARIOS_ONLY':
            errors.append('unsupported protocol or evidence scope')
        if not all(_text(policy[k]) for k in ('datasetVersion', 'labelVersion')):
            errors.append('datasetVersion and labelVersion must be assigned before sealing')
        if policy['testExposure'] != 'NOT_PREVIOUSLY_EXECUTED' or not _text(policy['exposureEvidence']):
            errors.append('members must declare unseen test inputs with evidence before first replay')
        approvals = policy['approvals']
        approval_times = []
        for role in ('M1', 'M10'):
            receipt = approvals.get(role) if isinstance(approvals, dict) else None
            try:
                if not isinstance(receipt, dict) or not all(_text(receipt.get(k)) for k in ('reviewer', 'evidence')):
                    raise ValueError('receipt absent')
                approval_times.append(_evidence_time(receipt.get('approvedAt')))
            except (ValueError, TypeError):
                errors.append(role + ' independent protocol approval receipt pending')
        slices = policy['criticalSlices']
        if not isinstance(slices, list) or not slices or any(not _text(s) for s in slices) or len(set(slices)) != len(slices):
            errors.append('criticalSlices must be a nonempty unique list agreed before replay')
            slices = []
        source_map = {}
        for source in sources:
            sid = source.get('sourceId')
            if not _text(sid) or sid in source_map:
                errors.append('missing or duplicate sourceId')
            else:
                source_map[sid] = source
            if source.get('kind') not in ('HUMAN_AUTHORED_SCENARIO', 'TEAM_SYNTHETIC_CATALOG', 'AUTHORIZED_CATALOG_EXPORT') or source.get('licenseStatus') != 'APPROVED' or not _text(source.get('evidence')):
                errors.append('source must have approved provenance; AI drafts are not independent human input')
        if source_map.get(policy['catalogSourceId'], {}).get('kind') not in ('TEAM_SYNTHETIC_CATALOG', 'AUTHORIZED_CATALOG_EXPORT'):
            errors.append('catalogSourceId must identify the provenance of the entire product snapshot')
        if not products or not requests or not annotations:
            errors.append('independent authored queries and reviewed complete corpus annotations are required')
        from services.m7_baseline.engine import VALIDATORS, validate_inputs
        from scripts.m7_phase2.pipeline import hard_constraints
        product_map = {}
        for product in products:
            if not VALIDATORS['product'].is_valid(product):
                errors.append('product violates processed schema')
                continue
            pid = product['productId']
            if pid in product_map:
                errors.append('duplicate productId: ' + pid)
            product_map[pid] = product
        request_map, texts, group_split, author_times = {}, set(), {}, []
        if not isinstance(splits, dict) or set(splits) != {'dev', 'test'} or any(not isinstance(v, list) for v in splits.values()):
            raise BundleError('splits must contain dev and test ID lists')
        dev, test = set(splits['dev']), set(splits['test'])
        if dev & test or len(dev) != len(splits['dev']) or len(test) != len(splits['test']):
            errors.append('split overlap or duplicate request IDs')
        for entry in requests:
            request = entry.get('request')
            if not isinstance(request, dict) or not VALIDATORS['request'].is_valid(request):
                errors.append('request violates processed schema')
                continue
            rid, task = request['requestId'], request['task']
            if rid in request_map:
                errors.append('duplicate requestId: ' + rid)
            request_map[rid] = entry
            try:
                validate_inputs(products, request, data['dictionary.json'])
                if task == 'matching' and (request['wanted'] is None or request['context']['viewerId'] != request['wanted']['ownerId']):
                    raise ValueError('matching identity must be the wanted owner')
                author_times.append(_evidence_time(entry.get('authoredAt')))
            except (ValueError, TypeError) as exc:
                errors.append('invalid request or authorship time ' + rid + ': ' + str(exc))
            if not _text(entry.get('author')) or entry.get('sourceId') not in source_map or source_map.get(entry.get('sourceId'), {}).get('kind') != 'HUMAN_AUTHORED_SCENARIO':
                errors.append('query requires actual human author and registered human scenario source: ' + rid)
            if not _text(entry.get('intentGroup')) or not isinstance(entry.get('slices'), list) or not entry['slices'] or any(not _text(s) for s in entry['slices']):
                errors.append('query requires intentGroup and slices: ' + rid)
                continue
            text = (task, ' '.join(unicodedata.normalize('NFKC', request['queryText']).casefold().split()))
            if not text[1] or text in texts:
                errors.append('empty or duplicate query text: ' + rid)
            texts.add(text)
            partition = 'dev' if rid in dev else 'test' if rid in test else 'missing'
            group = entry['intentGroup']
            if group in group_split and group_split[group] != partition:
                errors.append('intent group leakage across dev/test: ' + group)
            group_split[group] = partition
        if dev | test != set(request_map):
            errors.append('splits must cover every request exactly once')
        labels, review_times = {}, []
        for annotation in annotations:
            rid, pid = annotation.get('requestId'), annotation.get('productId')
            if rid not in request_map or pid not in product_map:
                errors.append('annotation references unknown request or product')
                continue
            query_labels = labels.setdefault(rid, {})
            if pid in query_labels:
                errors.append('duplicate annotation: ' + rid + '/' + pid)
            reviews = annotation.get('reviews')
            if not isinstance(reviews, list) or len(reviews) != 2:
                errors.append('exactly two independent human reviews required: ' + rid + '/' + pid)
                continue
            try:
                dates = []
                for review in reviews:
                    if not _label(review.get('label')) or not all(_text(review.get(k)) for k in ('reviewer', 'reason', 'evidence')):
                        raise ValueError('label/reviewer/reason/evidence missing')
                    dates.append(_evidence_time(review.get('reviewedAt')))
                if reviews[0]['reviewer'].strip().casefold() == reviews[1]['reviewer'].strip().casefold():
                    raise ValueError('two independent reviewers must be different people')
                if min(dates) < _time(request_map[rid].get('authoredAt')):
                    raise ValueError('review predates query authorship')
                if reviews[0]['label'] != reviews[1]['label']:
                    decision = annotation.get('adjudication')
                    if not isinstance(decision, dict) or not _label(decision.get('label')) or not all(_text(decision.get(k)) for k in ('reviewer', 'reason', 'evidence')):
                        raise ValueError('disagreement requires explicit adjudication')
                    when = _evidence_time(decision.get('reviewedAt'))
                    if when < max(dates):
                        raise ValueError('adjudication predates peer review')
                    dates.append(when)
                elif annotation.get('adjudication') is not None:
                    raise ValueError('adjudication is only used for disagreement')
                label = _final_label(annotation)
                effective = _effective(request_map[rid]['request'])
                eligibility = hard_constraints(effective, product_map[pid], data['dictionary.json'])[1]
                if (eligibility == 'ineligible' and label != 0) or (eligibility == 'needs_info' and label != 'U'):
                    raise ValueError('label conflicts with hard constraints or missing product facts')
                query_labels[pid] = label
                review_times.extend(dates)
            except (ValueError, TypeError, KeyError) as exc:
                errors.append('invalid independent review ' + rid + '/' + pid + ': ' + str(exc))
        if any(set(labels.get(rid, {})) != set(product_map) for rid in request_map):
            errors.append('annotations must judge the complete corpus for every request, with no missing pairs')
        if approval_times and review_times and min(approval_times) < max(review_times):
            errors.append('protocol approval receipt predates completed reviews')
        counts = report['requestCounts']
        eligible = []
        for rid in test:
            entry = request_map.get(rid)
            if not entry:
                continue
            request = entry['request']
            judged = labels.get(rid, {})
            if not judged or set(judged) != set(product_map) or 'U' in judged.values() or _inactive(request):
                continue
            counts[request['task']] += 1
            eligible.append(entry)
        for task, gate in thresholds().items():
            if counts[task] < gate['minimumExampleCount']:
                errors.append(f'{task}: independently reviewed test requests {counts[task]} < {gate["minimumExampleCount"]}')
            for slice_name in slices:
                size = sum(e['request']['task'] == task and slice_name in e['slices'] for e in eligible)
                if size < gate['thresholds']['minimumSliceCount']:
                    errors.append(f'{task}/{slice_name}: test slice count {size} below required minimum')
        search_bounds = [min(5, sum(type(v) is int and v >= 2 for v in labels[e['request']['requestId']].values())) / 5
                         for e in eligible if e['request']['task'] == 'search' and any(type(v) is int and v >= 2 for v in labels[e['request']['requestId']].values())]
        report['searchPrecisionAt5UpperBound'] = sum(search_bounds) / len(search_bounds) if search_bounds else None
        if not search_bounds or report['searchPrecisionAt5UpperBound'] < thresholds()['search']['thresholds']['precisionAt5Min']:
            warnings.append('strict P@5 data ceiling below 0.70 or undefined; preserve no-answer/negative cases, never pad positives')
        report.update(productCount=len(product_map), annotationPairCount=len(annotations),
                      testRequestCount=len(test), devRequestCount=len(dev),
                      approvalVerification='declared receipts only; M10 must verify member identity and source evidence')
    except (BundleError, ValueError, OSError, TypeError, KeyError, AttributeError) as exc:
        errors.append(str(exc))
    report['readyToSeal'] = not errors
    report['status'] = 'READY_FOR_RECEIPT_VERIFICATION_AND_SEAL' if not errors else 'NOT_READY'
    return report


def _runtime_hashes():
    paths = [GATES, ROOT / 'schemas/m7-phase2/dataset.schema.json',
             ROOT / 'docs/evidence/phase-4/intelligence/model-config.candidate.json',
             ROOT / 'docs/evidence/phase-4/intelligence/source-provenance.json']
    for directory in ('scripts/m7_evaluation', 'scripts/m7_phase2', 'services/m7_baseline', 'services/m7_semantic'):
        paths.extend((ROOT / directory).rglob('*.py'))
    paths.extend((ROOT / 'schemas/m7-phase2').rglob('*.json'))
    paths.extend((ROOT / 'services/m7_semantic').glob('requirements*.txt'))
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in sorted(set(paths)) if 'tests' not in p.parts}


def _source_identity():
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True)
    status = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True)
    return dict(commit=commit.stdout.strip() if commit.returncode == 0 else None,
                workingTreeDirty=bool(status.stdout.strip()) if status.returncode == 0 else None,
                note='runtime hashes are authoritative; M10 must obtain the matching committed source and verify external freeze receipt')


def seal_bundle(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    report = inspect_bundle(source)
    if not report['readyToSeal']:
        raise BundleError('seal refused: ' + '; '.join(report['errors']))
    if destination.exists() or source == destination or source in destination.parents:
        raise BundleError('snapshot destination must be new and outside the source bundle')
    # Inputs are copied before writing the manifest; the source is untouched.
    destination.mkdir(parents=True)
    for name in FILES:
        shutil.copyfile(source / name, destination / name)
    copied_report = inspect_bundle(destination)
    if not copied_report['readyToSeal']:
        raise BundleError('copied inputs changed during sealing')
    manifest = dict(schemaVersion='m7-evaluation-freeze-v1', status='SEALED_FOR_REPLAY_NOT_ACCEPTED',
                    formalAcceptance=False, M10IndependentExecution=None, M1ModelDecision=None,
                    sealedAtUtc=datetime.now(timezone.utc).isoformat(),
                    sourceIdentity=_source_identity(),
                    files={name: sha(destination / name) for name in FILES},
                    runtimeHashes=_runtime_hashes(), reviewSummary=copied_report,
                    scope='constructed scenarios; no claim of real user traffic or production acceptance')
    write(destination / 'freeze.json', manifest)
    return manifest


def load_snapshot(snapshot):
    snapshot = Path(snapshot).resolve()
    try:
        manifest = read(snapshot / 'freeze.json')
        if (snapshot / 'freeze.json').is_symlink():
            raise BundleError('freeze manifest may not be a symbolic link')
        if manifest.get('schemaVersion') != 'm7-evaluation-freeze-v1' or manifest.get('status') != 'SEALED_FOR_REPLAY_NOT_ACCEPTED' or manifest.get('formalAcceptance') is not False:
            raise BundleError('invalid freeze status')
        if set(manifest['files']) != set(FILES):
            raise BundleError('freeze file names must match the fixed safe file set')
        data = _load(snapshot)
        if any(sha(snapshot / name) != expected for name, expected in manifest['files'].items()):
            raise BundleError('frozen payload hash mismatch')
        if manifest.get('runtimeHashes') != _runtime_hashes():
            raise BundleError('runtime/config changed since freeze; restore the recorded source commit')
        report = inspect_bundle(snapshot)
        if not report['readyToSeal']:
            raise BundleError('frozen inputs no longer valid: ' + '; '.join(report['errors']))
        return data
    except (OSError, ValueError, TypeError, KeyError) as exc:
        raise BundleError('invalid frozen snapshot: ' + str(exc)) from exc


def score_rankings(requests, labels, rankings):
    """Strict label >=2, fixed denominator P@5; U/expired/no-answer stay visible."""
    ids = [entry['request']['requestId'] for entry in requests]
    if len(ids) != len(set(ids)) or set(rankings) != set(ids) or set(labels) != set(ids):
        raise BundleError('rankings and qrels must cover each request exactly once')
    per_request = []
    for entry in requests:
        request = entry['request']
        rid = request['requestId']
        qrels, ranked = labels[rid], rankings[rid]
        if not isinstance(ranked, list) or len(ranked) != len(set(ranked)) or not set(ranked) <= set(qrels):
            raise BundleError('duplicate or unjudged ranked product in ' + rid)
        if not qrels or any(not _label(v) for v in qrels.values()):
            raise BundleError('invalid or empty qrels in ' + rid)
        positives = {pid for pid, label in qrels.items() if type(label) is int and label >= 2}
        excluded = 'UNKNOWN_LABEL' if 'U' in qrels.values() else 'WANTED_INACTIVE' if _inactive(request) else None
        first = next((i for i, pid in enumerate(ranked[:10], 1) if pid in positives), None)
        row = dict(requestId=rid, task=request['task'], slices=entry['slices'], excludedReason=excluded,
                   positiveCount=len(positives), returnedCount=len(ranked), precisionAt5=None,
                   recallAt10=None, mrrAt10=None, noAnswerEmpty=None)
        if not excluded and positives:
            row.update(precisionAt5=len(set(ranked[:5]) & positives) / 5,
                       recallAt10=len(set(ranked[:10]) & positives) / len(positives),
                       mrrAt10=1 / first if first else 0)
        elif not excluded:
            row['noAnswerEmpty'] = not ranked
        per_request.append(row)
    def summarize(selected):
        positive = [r for r in selected if not r['excludedReason'] and r['positiveCount']]
        no_answer = [r for r in selected if r['noAnswerEmpty'] is not None]
        result = dict(requestCount=len(selected), positiveRequestCount=len(positive),
                      eligibleRequestCount=sum(not r['excludedReason'] for r in selected),
                      excludedRequestCount=sum(bool(r['excludedReason']) for r in selected),
                      noAnswerRequestCount=len(no_answer),
                      noAnswerEmptyAccuracy=sum(r['noAnswerEmpty'] for r in no_answer) / len(no_answer) if no_answer else None)
        for key in ('precisionAt5', 'recallAt10', 'mrrAt10'):
            result[key] = sum(r[key] for r in positive) / len(positive) if positive else None
        return result
    return dict(labelThreshold=2, precisionAt5Denominator=5, formalAcceptance=False, perRequest=per_request,
                byTask={task: summarize([r for r in per_request if r['task'] == task]) for task in TASKS},
                bySlice={task: {s: summarize([r for r in per_request if r['task'] == task and s in r['slices']])
                                for s in sorted({s for r in per_request if r['task'] == task for s in r['slices']})} for task in TASKS})


def compare_quality(baseline, candidate, critical_slices, violations):
    """Compare original quality gates, separately from operational acceptance."""
    result = {}
    for task, gate in thresholds().items():
        before, after = baseline['byTask'][task], candidate['byTask'][task]
        limits = gate['thresholds']
        improvement = after['mrrAt10'] / before['mrrAt10'] - 1 if before['mrrAt10'] and after['mrrAt10'] is not None else None
        checks = dict(minimumExampleCount=after['eligibleRequestCount'] >= gate['minimumExampleCount'],
                      mrrAt10=after['mrrAt10'] is not None and after['mrrAt10'] >= limits['mrrAt10Min'],
                      recallAt10=after['recallAt10'] is not None and after['recallAt10'] >= limits['recallAt10Min'],
                      relativeMrrImprovement=improvement is not None and improvement >= limits['relativeMrrImprovementMin'])
        if 'precisionAt5Min' in limits:
            checks['precisionAt5'] = after['precisionAt5'] is not None and after['precisionAt5'] >= limits['precisionAt5Min']
        checks['hardConstraintViolations'] = violations.get(task, 0) == 0
        slices = {}
        for name in critical_slices:
            old = baseline['bySlice'][task].get(name, {})
            new = candidate['bySlice'][task].get(name, {})
            drop = old['recallAt10'] - new['recallAt10'] if old.get('recallAt10') is not None and new.get('recallAt10') is not None else None
            slices[name] = dict(recallDrop=drop, positiveRequestCount=new.get('positiveRequestCount', 0),
                                passed=new.get('eligibleRequestCount', 0) >= limits['minimumSliceCount'] and drop is not None and drop <= limits['sliceRecallDropMax'])
        checks['criticalSlices'] = bool(slices) and all(s['passed'] for s in slices.values())
        result[task] = dict(checks=checks, qualityGatePass=all(checks.values()),
                            relativeMrrImprovement=improvement, requiredThresholds=limits, slices=slices)
    return result


def _rank_models(data, output, model_dir):
    from services.m7_baseline.engine import rank as baseline_rank, ServiceError
    from services.m7_semantic.hybrid import rank as candidate_rank
    from services.m7_semantic.model import Encoder, document_text, fingerprint
    from services.m7_semantic.index import VectorIndex
    from services.m7_semantic.evaluate import percentile, peak_rss_mib
    from scripts.m7_phase2.pipeline import hard_constraints
    products, dictionary = data['products.jsonl'], data['dictionary.json']
    encoder = Encoder(model_dir, dictionary)
    documents = [document_text(p, dictionary) for p in products]
    vectors = encoder.encode(documents)
    repeated = encoder.encode(documents)
    if fingerprint(vectors) != fingerprint(repeated):
        raise BundleError('ENCODING_NOT_REPEATABLE')
    index = VectorIndex(output / 'candidate.sqlite', identity=encoder.identity)
    rankings = {name: {} for name in ('baseline', 'candidate')}
    rows_out, timings = [], []
    violations = {task: 0 for task in TASKS}
    fallback_count = 0
    try:
        index.rebuild(products, vectors)
        for entry in data['requests.jsonl']:
            if entry['request']['requestId'] not in data['splits.json']['test']:
                continue
            request = entry['request']
            row = dict(requestId=request['requestId'], task=request['task'])
            for name, function in (('baseline', baseline_rank), ('candidate', candidate_rank)):
                started = time.perf_counter()
                try:
                    kwargs = {} if name == 'baseline' else dict(encoder=encoder, index=index, experimental=True)
                    response = function(products, request, dictionary, **kwargs)
                    outcome = dict(status='OK', response=response)
                except ServiceError as exc:
                    if exc.code != 'WANTED_INACTIVE':
                        raise
                    response = dict(items=[], metadata={})
                    outcome = dict(status='EXPECTED_INACTIVE', errorCode=exc.code, response=response)
                elapsed = (time.perf_counter() - started) * 1000
                timings.append(dict(requestId=request['requestId'], task=request['task'], algorithm=name, elapsedMs=elapsed))
                ids = [item['productId'] for item in response['items']]
                rankings[name][request['requestId']] = ids
                row[name] = outcome
                if name == 'candidate':
                    fallback_count += bool(response['metadata'].get('degraded'))
                    by_id = {p['productId']: p for p in products}
                    violations[request['task']] += sum(hard_constraints(_effective(request), by_id[pid], dictionary)[1] != 'eligible' for pid in ids)
            rows_out.append(row)
        summary = {task: {name: {key: percentile([r['elapsedMs'] for r in timings if r['task'] == task and r['algorithm'] == name], fraction)
                                for key, fraction in (('p95Ms', .95), ('p99Ms', .99))}
                          for name in rankings} for task in TASKS}
        write(output / 'per-query.json', rows_out)
        write(output / 'timings.json', dict(scope='single-process local measurements; not deployment SLA', rows=timings, summary=summary,
              peakProcessWorkingSetMiB=peak_rss_mib(), modelMiB=sum(p.stat().st_size for p in Path(model_dir).rglob('*') if p.is_file()) / 1024**2,
              indexMiB=(output / 'candidate.sqlite').stat().st_size / 1024**2))
        return rankings, dict(hardConstraintViolationCounts=violations, fallbackRequestCount=fallback_count,
                              encoderIdentity=encoder.identity, vectorsSha256=fingerprint(vectors), repeatedEncodingExact=True,
                              indexLogicalDigest=index.logical_digest())
    finally:
        index.close()


def run_snapshot(snapshot, output, *, model_dir):
    # Validate *before* loading weights, executing queries or creating run outputs.
    data = load_snapshot(snapshot)
    output = Path(output).resolve()
    if output.exists() or Path(snapshot).resolve() in output.parents:
        raise BundleError('run output must be new and outside the frozen snapshot')
    output.mkdir(parents=True)
    try:
        rankings, runtime = _rank_models(data, output, model_dir)
        ids = set(data['splits.json']['test'])
        requests = [r for r in data['requests.jsonl'] if r['request']['requestId'] in ids]
        labels = {rid: {} for rid in ids}
        for ann in data['annotations.jsonl']:
            if ann['requestId'] in ids:
                labels[ann['requestId']][ann['productId']] = _final_label(ann)
        scores = {name: score_rankings(requests, labels, rank) for name, rank in rankings.items()}
        for name, score in scores.items():
            write(output / (name + '-metrics.json'), score)
        write(output / 'rankings.json', rankings)
        comparisons = compare_quality(scores['baseline'], scores['candidate'], data['policy.json']['criticalSlices'], runtime['hardConstraintViolationCounts'])
        source_identity = _source_identity()
        report = dict(status='REPLAY_COMPLETE_NOT_ACCEPTED', formalAcceptance=False,
                      qualityGatePass=all(c['qualityGatePass'] for c in comparisons.values()),
                      formalDecision='NO_GO_PENDING_INDEPENDENT_ACCEPTANCE', comparisons=comparisons,
                      runtime=runtime, snapshotManifestSha256=sha(Path(snapshot) / 'freeze.json'),
                      sourceCommit=source_identity['commit'], sourceIdentity=source_identity,
                      checkedAtUtc=datetime.now(timezone.utc).isoformat(),
                      environment=dict(python=platform.python_version(), platform=platform.platform(),
                           packages={d.metadata['Name']: d.version for d in importlib.metadata.distributions()}),
                      pending=['M10 independent execution and receipt verification', 'M1 final model decision',
                               'release environment latency/resource and fallback acceptance'],
                      sourceScope='human constructed scenarios only; no real-traffic precision claim')
        write(output / 'evaluation-status.json', report)
        return report
    except Exception as exc:
        write(output / 'failure.json', dict(status='REPLAY_FAILED', errorType=type(exc).__name__, error=str(exc), formalAcceptance=False))
        raise
