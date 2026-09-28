"""AI2-01/02/03: validate, normalize, draft-label and partition synthetic data.

This is not a retrieval service, human review, metric runner or sealed test set.
"""
import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import sys
import tempfile
import unicodedata

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'data/m7-phase2/raw'
SCHEMA = ROOT / 'schemas/m7-phase2/dataset.schema.json'
SEED = '20260926'


class DataError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise DataError(message)


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def read_lines(path):
    result = []
    for n, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        require(bool(line.strip()), f'{path.name}:{n}: blank row')
        try:
            result.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise DataError(f'{path.name}:{n}: invalid JSON: {error}') from error
    require(bool(result), f'{path.name}: empty dataset')
    return result


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)+'\n', encoding='utf-8', newline='\n')


def write_lines(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(''.join(json.dumps(r, ensure_ascii=False, sort_keys=True)+'\n' for r in rows), encoding='utf-8', newline='\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(value):
    return ' '.join(unicodedata.normalize('NFKC', value).split())


def fingerprint(value):
    return ''.join(c for c in normalize(value).casefold() if c.isalnum())


def time_value(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})', value), f'invalid timestamp or missing timezone: {value}')
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as error:
        raise DataError(f'invalid timestamp: {value}') from error
    return parsed


def to_fen(value):
    if value is None:
        return None
    require(isinstance(value, str) and re.fullmatch(r'(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?', value), f'invalid decimal yuan: {value}')
    return int(Decimal(value)*100)


def validate(rows, kind, schema):
    validator = Draft202012Validator({'$ref':f'#/$defs/{kind}', '$defs':schema['$defs']})
    for i, row in enumerate(rows, 1):
        errors = list(validator.iter_errors(row))
        require(not errors, f'{kind}:{i}: ' + '; '.join(e.message for e in errors[:3]))


def unique(rows, key, label):
    seen = set()
    for row in rows:
        value = key(row)
        require(value not in seen, f'duplicate {label}: {value}')
        seen.add(value)


def prepare(raw):
    schema = read_json(SCHEMA)
    Draft202012Validator.check_schema(schema)
    dictionary = read_json(raw/'dictionary.json')
    assets = read_json(raw/'asset-manifest.json')
    snapshots = read_lines(raw/'products.jsonl')
    requests = read_lines(raw/'requests.jsonl')
    semantics = read_lines(raw/'semantic-drafts.jsonl')
    validate(snapshots, 'rawProduct', schema)
    validate(requests, 'rawRequest', schema)
    validate(semantics, 'semanticDraft', schema)
    unique(snapshots, lambda x:x['recordId'], 'raw record ID')
    unique(snapshots, lambda x:(x['sourceProduct']['id'], x['research']['entityVersion']), 'product/version')
    unique(requests, lambda x:x['requestId'], 'request ID')
    unique(semantics, lambda x:(x['requestId'],x['productId']), 'semantic pair')
    require(len(snapshots)==assets['rawProductSnapshots'] and len(requests)==assets['requests'] and len(semantics)==assets['semanticPairs'], 'asset counts do not match files')
    as_of = time_value(assets['asOf'])
    conditions = dictionary['conditionMap']
    categories = dictionary['categoryIds']
    places = dictionary['placeIds']
    campuses = dictionary['campusIds']
    catalog_ids = {s['catalogId'] for s in read_json(raw/'scenario-cards.json')}
    require(len(catalog_ids)>1, 'at least two catalogs required')
    groups = defaultdict(list)
    entity_to_product = {}
    for item in snapshots:
        p, extra = item['sourceProduct'], item['research']
        require(extra['catalogId'] in catalog_ids, 'unknown product catalog')
        require(extra['categoryId'] in categories and p['category']==extra['categoryId'], 'unknown or inconsistent category')
        require(extra['campusId'] in campuses, 'unknown campus')
        require(all(p in places for p in extra['placeIds']), 'unknown product place')
        require(time_value(p['createdAt'])<=time_value(p['updatedAt']), 'product created after updated')
        entity = extra['entityId']
        require(entity not in entity_to_product or entity_to_product[entity]==p['id'], 'entity maps to multiple product IDs')
        entity_to_product[entity] = p['id']
        groups[p['id']].append(item)
    products, audit = [], []
    for pid, history in sorted(groups.items()):
        history.sort(key=lambda r:r['research']['entityVersion'])
        require(len({r['research']['entityId'] for r in history})==1, 'product ID changes entity')
        require(len({r['research']['catalogId'] for r in history})==1, 'product snapshot changes catalog')
        require(all(time_value(a['sourceProduct']['updatedAt'])<=time_value(b['sourceProduct']['updatedAt']) for a,b in zip(history, history[1:])), 'entity versions have decreasing timestamps')
        eligible = [r for r in history if time_value(r['sourceProduct']['updatedAt'])<=as_of]
        require(bool(eligible), f'no snapshot available at asOf for {pid}')
        current = eligible[-1]
        for old in history:
            if old is not current:
                audit.append({'recordId':old['recordId'],'productId':str(pid),
                              'reason':'future_snapshot' if time_value(old['sourceProduct']['updatedAt'])>as_of else 'superseded_snapshot',
                              'selectedRecordId':current['recordId']})
        p, extra = current['sourceProduct'], current['research']
        products.append({'schemaVersion':'m7-processed-v1','productId':str(pid),'ownerId':str(p['seller']['id']),
            **{key:extra[key] for key in ['catalogId','entityId','nearDuplicateGroup','categoryId','campusId','placeIds','visibility','deleted','entityVersion','attributes']},
            'title':normalize(p['title']),'description':normalize(p['description']),
            'priceFen':to_fen(p['price']), 'condition':conditions.get(p['condition']),
            'status':p['status'],'publishedAt':p['createdAt'],'updatedAt':p['updatedAt'], 'sourceRecordId':current['recordId']})
    normalized_requests=[]
    for r in sorted(requests, key=lambda x:x['requestId']):
        require(r['catalogId'] in catalog_ids, 'unknown request catalog')
        require(time_value(r['context']['asOf'])==as_of, 'request asOf differs from corpus snapshot')
        require(r['context']['campusId'] is None or r['context']['campusId'] in campuses, 'unknown request campus')
        f=r['filters']
        require(f['categoryId'] is None or f['categoryId'] in categories, 'unknown filter category')
        require(all(p in places for p in f['requiredPlaceIds']), 'unknown filter place')
        low, high = to_fen(f['minPriceYuan']), to_fen(f['maxPriceYuan'])
        require(low is None or high is None or low<=high, 'reversed budget')
        w = r['wanted']
        if r['task']=='matching':
            require(w is not None and r['context']['viewerId']==w['ownerId'], 'matching requires authorized owner context')
            time_value(w['expiresAt'])
        else:
            require(w is None, 'search must not carry wanted context')
        normalized_requests.append({**r,'schemaVersion':'m7-processed-v1','queryText':normalize(r['queryText']),
            'filters':{'categoryId':f['categoryId'],'minPriceFen':low,'maxPriceFen':high,
                       'minCondition':conditions.get(f['minCondition']),
                       'requiredPlaceIds':f['requiredPlaceIds'],'requiredModel':f['requiredModel']}})
    validate(products, 'product', schema);validate(normalized_requests, 'request', schema)
    require(all(p['title'] for p in products), 'blank normalized title')
    catalogs=defaultdict(list)
    for p in products: catalogs[p['catalogId']].append(p)
    require(set(catalogs)==catalog_ids, 'empty or unlisted catalog')
    expected={(r['requestId'],p['productId']) for r in normalized_requests for p in catalogs[r['catalogId']]}
    actual={(s['requestId'],s['productId']) for s in semantics}
    require(expected==actual, f'semantic judgments are not exhaustive: missing={len(expected-actual)} extra={len(actual-expected)}')
    return products, normalized_requests, semantics, audit, dictionary, schema


def hard_constraints(q, p, dictionary):
    checks=[]
    def add(code, outcome, observed, required):
        checks.append(dict(code=code,outcome=outcome,observed=observed,required=required))
    def check(code, passed, observed, required):
        add(code,'pass' if passed else 'fail',observed,required)
    f,ctx,w=q['filters'],q['context'],q['wanted']
    if w is None: add('wanted_active','not_applicable',None,None)
    else: check('wanted_active',w['status']=='OPEN' and time_value(w['expiresAt'])>time_value(ctx['asOf']),
                {'status':w['status'],'expiresAt':w['expiresAt']},{'status':'OPEN','expiresAfter':ctx['asOf']})
    check('product_status',p['status']=='ON_SALE' and not p['deleted'],
          {'status':p['status'],'deleted':p['deleted']},{'status':'ON_SALE','deleted':False})
    visible=p['visibility']=='public' or (p['visibility']=='campus' and ctx['viewerId'] is not None and ctx['campusId']==p['campusId']) or (p['visibility']=='private' and ctx['viewerId']==p['ownerId'])
    check('visibility',visible,p['visibility'],'trusted synthetic context must permit visibility')
    if w is None: add('not_self','not_applicable',None,None)
    else: check('not_self',w['ownerId']!=p['ownerId'],p['ownerId'],{'not':w['ownerId']})
    if f['categoryId'] is None: add('category','not_applicable',p['categoryId'],None)
    else: check('category',f['categoryId']==p['categoryId'],p['categoryId'],f['categoryId'])
    check('budget',(f['minPriceFen'] is None or p['priceFen']>=f['minPriceFen']) and (f['maxPriceFen'] is None or p['priceFen']<=f['maxPriceFen']),
          p['priceFen'],{'min':f['minPriceFen'],'max':f['maxPriceFen']})
    if f['minCondition'] is None: add('condition','not_applicable',p['condition'],None)
    elif p['condition'] is None: add('condition','unknown',None,f['minCondition'])
    else: check('condition',dictionary['conditionRank'][p['condition']]>=dictionary['conditionRank'][f['minCondition']],p['condition'],f['minCondition'])
    if not f['requiredPlaceIds']: add('place','not_applicable',p['placeIds'],[])
    elif not p['placeIds']: add('place','unknown',[],f['requiredPlaceIds'])
    else: check('place',bool(set(f['requiredPlaceIds'])&set(p['placeIds'])),p['placeIds'],f['requiredPlaceIds'])
    if f['requiredModel'] is None: add('model','not_applicable',p['attributes']['model'],None)
    elif p['attributes']['model'] is None: add('model','unknown',None,f['requiredModel'])
    else: check('model',normalize(p['attributes']['model']).casefold()==normalize(f['requiredModel']).casefold(),p['attributes']['model'],f['requiredModel'])
    outcomes={c['outcome'] for c in checks}
    status='ineligible' if 'fail' in outcomes else 'needs_info' if 'unknown' in outcomes else 'eligible'
    return checks,status


def label_pairs(products, requests, semantics, dictionary, schema):
    semantic={(s['requestId'],s['productId']):s for s in semantics}
    result=[]
    for q in requests:
        for p in products:
            if p['catalogId']!=q['catalogId']: continue
            judgment=semantic[q['requestId'],p['productId']]
            checks,status=hard_constraints(q,p,dictionary)
            label=0 if status=='ineligible' else 'U' if status=='needs_info' else judgment['semanticLabel']
            result.append({'labelId':q['requestId']+'__'+p['productId'], 'requestId':q['requestId'],
                'productId':p['productId'],'catalogId':q['catalogId'],'labelVersion':'m7-label-draft-v1',
                'semanticLabel':judgment['semanticLabel'],'label':label,'eligibility':status,'constraints':checks,
                'reason':judgment['semanticReason']+' 资格不通过时最终标签为 0；关键条件未知且无已知失败时为 U。',
                'author':judgment['author'],'reviewer':None,'adjudicator':None,'reviewStatus':'pending_human_review'})
    validate(result,'label',schema)
    return result


def partition(products, requests):
    catalogs=sorted({p['catalogId'] for p in products})
    parent={c:c for c in catalogs}
    edges=[]
    def find(x):
        while parent[x]!=x:
            parent[x]=parent[parent[x]];x=parent[x]
        return x
    def join(a,b,why):
        if a==b:return
        aa,bb=find(a),find(b)
        if aa!=bb:parent[max(aa,bb)]=min(aa,bb)
        edges.append({'a':a,'b':b,'reason':why})
    for rows,field in [(products,'entityId'),(products,'nearDuplicateGroup'),(requests,'templateGroup')]:
        owners={}
        for r in rows:
            value=r[field]
            if value in owners:join(owners[value],r['catalogId'],field)
            owners[value]=r['catalogId']
    # Inspect text similarity globally before assigning splits, not after discarding hard examples.
    for rows,fields in [(products,['title','description']),(requests,['queryText'])]:
        for i,a in enumerate(rows):
            for b in rows[i+1:]:
                if a['catalogId']==b['catalogId']:continue
                aa=fingerprint(' '.join(a[f] for f in fields));bb=fingerprint(' '.join(b[f] for f in fields))
                if aa and (aa==bb or (min(len(aa),len(bb))>=8 and SequenceMatcher(None,aa,bb,autojunk=False).ratio()>=0.90)):
                    join(a['catalogId'],b['catalogId'],'normalized_text_similarity>=0.90')
    components=defaultdict(list)
    for c in catalogs:components[find(c)].append(c)
    ordered=sorted(components.values(), key=lambda cs:hashlib.sha256((SEED+'|'+','.join(sorted(cs))).encode()).hexdigest())
    require(len(ordered)>=2,'leakage graph leaves fewer than two independent groups; redesign dataset')
    cut=max(1,min(len(ordered)-1,len(ordered)*2//3))
    assignment={c:('dev' if i<cut else 'test_candidate') for i,cs in enumerate(ordered) for c in cs}
    violations=[e for e in edges if assignment[e['a']]!=assignment[e['b']]]
    require(not violations,'cross-split leakage detected')
    return assignment,{'method':'connected components then SHA256(seed|sorted_catalog_ids) ordering',
        'seed':SEED,'componentCount':len(ordered),'components':ordered,'requestedRatio':'approximately 2:1 by component count',
        'crossCatalogEdges':edges,'crossSplitViolations':violations,
        'textNormalization':'NFKC + casefold + alphanumeric only','nearDuplicateThreshold':0.90,
        'limitations':'Lexical heuristic plus declared template/entity families; no proof against semantic or pretraining leakage',
        'testStatus':'candidate_not_sealed; labels visible to creator; human review pending'}


def build(raw, output):
    require(not output.exists() or not any(output.iterdir()), 'output directory must be empty; do not overwrite reviewed data')
    products, requests, semantics, audit, dictionary, schema=prepare(raw)
    labels=label_pairs(products,requests,semantics,dictionary,schema)
    assignment,leakage=partition(products,requests)
    output.mkdir(parents=True,exist_ok=True)
    write_lines(output/'products.jsonl',products);write_lines(output/'requests.jsonl',requests)
    write_lines(output/'labels.draft.jsonl',labels);write_lines(output/'snapshot-audit.jsonl',audit)
    unresolved={r['requestId'] for r in labels if r['label']=='U'}
    exclusions=[{'requestId':rid,'reason':'unresolved_U_exclude_entire_query_from_all_main_comparisons'} for rid in sorted(unresolved)]
    inactive={q['requestId'] for q in requests if q['wanted'] and (q['wanted']['status']!='OPEN' or time_value(q['wanted']['expiresAt'])<=time_value(q['context']['asOf']))}
    exclusions += [{'requestId':rid,'reason':'inactive_wanted_boundary_case_not_relevance_benchmark'} for rid in sorted(inactive)]
    write_json(output/'exclusions.json',exclusions)
    product_map={p['productId']:p for p in products};request_map={q['requestId']:q for q in requests}
    columns=['labelId','requestId','productId','split','task','queryText','filters','context','wanted','title','description','priceFen','condition','status','visibility',
             'candidateLabel','candidateReason','constraintChecks','reviewer','reviewLabel','reviewReason','reviewedAt',
             'dispute','adjudicator','finalLabel','adjudicatedAt']
    with (output/'review-queue.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns,lineterminator='\n');writer.writeheader()
        for l in labels:
            p,q=product_map[l['productId']],request_map[l['requestId']]
            writer.writerow({'labelId':l['labelId'],'requestId':l['requestId'],'productId':l['productId'],
                'split':assignment[l['catalogId']],'task':q['task'],
                'queryText':q['queryText'],'filters':json.dumps(q['filters'],ensure_ascii=False,sort_keys=True),
                'context':json.dumps(q['context'],ensure_ascii=False,sort_keys=True),
                'wanted':json.dumps(q['wanted'],ensure_ascii=False,sort_keys=True),
                **{k:p[k] for k in ['title','description','priceFen','condition','status','visibility']},
                'candidateLabel':l['label'],'candidateReason':l['reason'],
                'constraintChecks':json.dumps(l['constraints'],ensure_ascii=False,sort_keys=True)})
    for split in ['dev','test_candidate']:
        items={'catalogIds':sorted(c for c,s in assignment.items() if s==split),
            'productIds':sorted(p['productId'] for p in products if assignment[p['catalogId']]==split),
            'requestIds':sorted(q['requestId'] for q in requests if assignment[q['catalogId']]==split),
            'labelIds':sorted(l['labelId'] for l in labels if assignment[l['catalogId']]==split),
            'unresolvedRequestIds':sorted(q['requestId'] for q in requests if assignment[q['catalogId']]==split and q['requestId'] in unresolved)}
        write_json(output/'splits'/f'{split}.json',items)
    write_json(output/'leakage-report.json',leakage)
    no_answer=[q['requestId'] for q in requests if q['requestId'] not in unresolved|inactive and not any(l['label']==2 for l in labels if l['requestId']==q['requestId'])]
    summary={'products':len(products),'rawSnapshots':len(products)+len(audit),'requests':len(requests),'pairs':len(labels),
        'labels':dict(Counter(str(l['label']) for l in labels)), 'humanReviewedPairs':0,
        'pendingHumanReviewPairs':len(labels),'unresolvedRequests':sorted(unresolved),'noAnswerRequests':no_answer,
        'inactiveWantedRequests':sorted(inactive),'mainComparableRequestsBeforeHumanReview':len(requests)-len(unresolved|inactive),
        'snapshotAudit':dict(Counter(a['reason'] for a in audit)),
        'missingFields':{'condition':sum(p['condition'] is None for p in products),'model':sum(p['attributes']['model'] is None for p in products)},
        'splitCounts':{s:{'catalogs':sum(v==s for v in assignment.values()),
                          'products':sum(assignment[p['catalogId']]==s for p in products),
                          'requests':sum(assignment[q['catalogId']]==s for q in requests),
                          'pairs':sum(assignment[l['catalogId']]==s for l in labels)} for s in ['dev','test_candidate']},
        'reviewGate':'pending_human_review; not usable as approved performance evidence'}
    write_json(output/'summary.json',summary)
    manifest={'datasetVersion':'m7-synthetic-p2-v1.1','schemaVersion':'m7-processed-v1','labelVersion':'m7-label-draft-v1',
        'serializationVersion':'utf8-lf-v1; review CSV uses utf8-sig and LF',
        'dictionaryVersion':dictionary['version'],'seed':SEED,'status':'candidate_not_team_frozen',
        'sourceHashes':{p.name:digest(p) for p in sorted(raw.iterdir()) if p.is_file()},
        'schemaSha256':digest(SCHEMA), 'pipelineSha256':digest(Path(__file__)),
        'requirementsSha256':digest(Path(__file__).with_name('requirements.txt')),
        'derivedHashes':{p.relative_to(output).as_posix():digest(p) for p in sorted(output.rglob('*')) if p.is_file()}}
    write_json(output/'manifest.json',manifest)
    return summary


def verify(raw,bundle):
    manifest=read_json(bundle/'manifest.json')
    require(manifest['sourceHashes']=={p.name:digest(p) for p in sorted(raw.iterdir()) if p.is_file()}, 'raw hash mismatch')
    require(manifest['schemaSha256']==digest(SCHEMA),'schema hash mismatch')
    require(manifest['pipelineSha256']==digest(Path(__file__)),'pipeline hash mismatch; new version required')
    require(manifest['requirementsSha256']==digest(Path(__file__).with_name('requirements.txt')),'dependency lock hash mismatch')
    actual={p.relative_to(bundle).as_posix():digest(p) for p in sorted(bundle.rglob('*')) if p.is_file() and p.name!='manifest.json'}
    require(actual==manifest['derivedHashes'],'derived file hash mismatch')
    with tempfile.TemporaryDirectory() as tmp:
        rebuilt=Path(tmp)/'rebuilt'
        build(raw,rebuilt)
        require((rebuilt/'manifest.json').read_bytes()==(bundle/'manifest.json').read_bytes(),'deterministic rebuild mismatch')
    return {'result':'pass','byteIdenticalRebuild':True,'rawHashes':'pass','derivedHashes':'pass',
            'note':'automated validation only; no independent human label review'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['build','verify'])
    parser.add_argument('--raw-dir',type=Path,default=RAW)
    parser.add_argument('--output-dir',type=Path)
    parser.add_argument('--bundle-dir',type=Path,default=ROOT/'data/m7-phase2/derived')
    args=parser.parse_args()
    try:
        if args.command=='build':
            require(args.output_dir is not None,'build requires --output-dir')
            result=build(args.raw_dir,args.output_dir)
        else: result=verify(args.raw_dir,args.bundle_dir)
        print(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2))
        return 0
    except (DataError,ValueError,KeyError,OSError) as error:
        print(json.dumps({'result':'fail','error':str(error)},ensure_ascii=False),file=sys.stderr)
        return 1


if __name__=='__main__':
    sys.exit(main())
