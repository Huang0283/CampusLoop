"""AI2-04/05 candidate contract validation and sequential lifecycle specification.

No HTTP server, database transactions, production scheduler or notification delivery.
"""
import argparse
import copy
from datetime import datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / 'schemas/m7-phase2/contracts.schema.json'
FORMATS = FormatChecker()


@FORMATS.checks('date-time', raises=(ValueError, TypeError))
def valid_datetime(value):
    # Do not rely on optional jsonschema[format] extras being installed.
    if not isinstance(value, str):
        return True
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})', value) is None:
        return False
    return datetime.fromisoformat(value.replace('Z', '+00:00')).utcoffset() is not None


class ContractError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ContractError(message)


def canonical(value):
    # Contract fixtures use finite JSON numbers and JS-safe integer identifiers.
    # Cross-language producers must use the persisted key, not re-serialize floats.
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def digest(prefix, value):
    return prefix + '_' + hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()


def task_key(input_version):
    return digest('task', input_version)


def result_version(result):
    return digest('rs', {k: v for k, v in result.items() if k not in ('resultVersion', 'state')})


def notification_key(intent):
    return digest('notice', {k: intent[k] for k in ('recipientId', 'wantedId', 'productId', 'eligibilityEpoch')})


def dt(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def validate_schema(kind, payload):
    schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator({**schema, '$ref': '#/$defs/' + kind}, format_checker=FORMATS)
    errors = sorted(validator.iter_errors(payload), key=lambda e: str(list(e.path)))
    require(not errors, f'{kind}: ' + '; '.join(f'{list(e.path)} {e.message}' for e in errors[:3]))


def check_request(kind, payload):
    validate_schema(kind, payload)
    if kind == 'SearchRequest':
        require(bool(unicodedata.normalize('NFKC', payload['query']).strip()), 'blank query')
        if 'minPriceFen' in payload and 'maxPriceFen' in payload:
            require(payload['minPriceFen'] <= payload['maxPriceFen'], 'inverted budget')
    require(payload['page'] == 1 or 'snapshotVersion' in payload, 'later page requires snapshotVersion')


def check_reasons(score, details):
    mapping = {'TEXT_MATCH': ('factor', 'text'), 'BUDGET_MATCH': ('constraint', 'priceFen'),
               'CONDITION_MATCH': ('constraint', 'conditionRank'), 'CATEGORY_MATCH': ('constraint', 'categoryId'),
               'LOCATION_MATCH': ('constraint', 'placeIds')}
    factors = []
    codes = []
    for reason in details:
        codes.append(reason['code'])
        require((reason['kind'], reason['field']) == mapping[reason['code']], 'reason code/field mismatch')
        if reason['kind'] == 'factor':
            require(reason['contribution'] is not None, 'factor needs contribution')
            require(isinstance(reason['observed'], list) and isinstance(reason['required'], list), 'text facts need token arrays')
            factors.append(reason['contribution'])
        else:
            require(reason['contribution'] is None, 'constraint cannot raise score')
        obs, required = reason['observed'], reason['required']
        if reason['code'] == 'BUDGET_MATCH':
            require(isinstance(obs, int) and not isinstance(obs, bool) and isinstance(required, dict), 'budget needs fen and bounds')
            lo, hi = required['min'], required['max']
            require(lo is None or hi is None or lo <= hi, 'reason budget inverted')
            require((lo is None or lo <= obs) and (hi is None or obs <= hi), 'false budget explanation')
        if reason['code'] == 'CONDITION_MATCH':
            require(type(obs) is int and type(required) is int and 1 <= required <= obs <= 5, 'false condition explanation')
        if reason['code'] == 'CATEGORY_MATCH':
            require(isinstance(obs, str) and obs == required, 'false category explanation')
        if reason['code'] == 'LOCATION_MATCH':
            require(isinstance(obs, list) and isinstance(required, list) and bool(set(obs) & set(required)), 'false location explanation')
    require(len(codes) == len(set(codes)), 'duplicate reason code')
    if score is None:
        require(not factors, 'unscored item cannot have factors')
    else:
        require(bool(factors) and abs(sum(factors) - score) <= 1e-8, 'contributions must sum to score')


ERROR_STATUS = {'VALIDATION_ERROR': 422, 'UNAUTHENTICATED': 401, 'FORBIDDEN': 403,
    'NOT_FOUND': 404, 'SNAPSHOT_STALE': 409, 'WANTED_INACTIVE': 409,
    'DEPENDENCY_UNAVAILABLE': 503, 'BASELINE_UNAVAILABLE': 503, 'RATE_LIMITED': 429}


def check_exchange(case):
    require(set(case) == {'caseId', 'operation', 'request', 'httpStatus', 'response'}, 'unknown exchange fields')
    require(case['operation'] in ('search', 'match'), 'unknown operation')
    search = case['operation'] == 'search'
    request_kind = 'SearchRequest' if search else 'MatchRequest'
    status, response = case['httpStatus'], case['response']
    if status == 422:
        validate_schema('Error', response)
        require(response['code'] == 'VALIDATION_ERROR', '422 code mismatch')
        try:
            check_request(request_kind, case['request'])
        except (ContractError, TypeError):
            return
        raise ContractError('422 fixture must contain an invalid request')
    check_request(request_kind, case['request'])
    if status not in (200, 202):
        validate_schema('Error', response)
        require(ERROR_STATUS[response['code']] == status, 'error HTTP status mismatch')
        return
    if status == 202:
        require(not search, 'pending is matching-only')
        validate_schema('Pending', response)
        require(response['data']['wantedId'] == case['request']['wantedId'], 'pending wanted mismatch')
        return
    validate_schema('SearchSuccess' if search else 'MatchSuccess', response)
    data = response['data']
    if 'snapshotVersion' in case['request']:
        require(data['snapshotVersion'] == case['request']['snapshotVersion'], 'snapshot token changed within page sequence')
    require(dt(data['generatedAt']) < dt(data['expiresAt']), 'invalid result validity window')
    requested = data['requestedMode' if search else 'requestedMethod']
    actual = data['mode' if search else 'method']
    baseline = 'keyword' if search else 'rule'
    if search:
        require(requested == case['request']['mode'], 'request mode mismatch')
    else:
        require(data['wantedId'] == case['request']['wantedId'], 'wrong wanted')
    if data['degraded']:
        require(data['degradationReason'] is not None and requested != baseline and actual == baseline, 'invalid degradation')
    else:
        require(data['degradationReason'] is None and requested == actual, 'silent fallback')
    if actual == baseline:
        require(data['modelVersion'] is None and data['indexVersion'] is None, 'baseline cannot claim model/index')
    else:
        require(data['modelVersion'] is not None and data['indexVersion'] is not None, 'model/index version missing')
    p = data['pagination']
    require(p['page'] == case['request']['page'] and p['pageSize'] == case['request']['pageSize'], 'pagination echo mismatch')
    expected_count = min(p['pageSize'], max(0, p['total']-(p['page']-1)*p['pageSize']))
    require(len(data['items']) == expected_count, 'page count mismatch')
    ids = [i['id'] if search else i['product']['id'] for i in data['items']]
    require(len(ids) == len(set(ids)), 'duplicate product')
    for entry in data['items']:
        product = entry if search else entry['product']
        for field in ('price', 'originalPrice'):
            if field in product:
                fen = Decimal(str(product[field])) * 100
                require(fen == fen.to_integral_value(), 'amount must have at most two decimal places')
    if search:
        require([e['productId'] for e in data['explanations']] == ids, 'explanations must align with products')
        for product, item in zip(data['items'], data['explanations']):
            check_reasons(item['relevanceScore'], item['explanationDetails'])
            for reason in item['explanationDetails']:
                if reason['code'] == 'BUDGET_MATCH':
                    require(Decimal(str(product['price'])) * 100 == reason['observed'], 'budget explanation differs from product price')
    else:
        for item in data['items']:
            require(item['resultVersion'] == data['resultVersion'], 'mixed result versions')
            require(item['wantedVersion'] == data['wantedVersion'], 'mixed wanted versions')
            require(dt(item['expiresAt']) == dt(data['expiresAt']), 'mixed expiry')
            require((item['scoreType'] == 'constraints_only') == (item['relevanceScore'] is None), 'score type mismatch')
            if item['scoreType'] != 'constraints_only':
                require((item['scoreType'] == 'rule_match_v0') == (actual == 'rule'), 'score method mismatch')
            check_reasons(item['relevanceScore'], item['explanationDetails'])

            for reason in item['explanationDetails']:
                if reason['code'] == 'BUDGET_MATCH':
                    require(Decimal(str(item['product']['price'])) * 100 == reason['observed'], 'budget explanation differs from product price')


def validate(kind, payload):
    if kind == 'Exchange':
        return check_exchange(payload)
    if kind in ('SearchRequest', 'MatchRequest'):
        return check_request(kind, payload)
    validate_schema(kind, payload)
    if kind == 'Event':
        require(payload['eventType'] == {'product':'PRODUCT_CHANGED', 'wanted':'WANTED_CHANGED',
            'authorization':'AUTHORIZATION_CHANGED','policy':'POLICY_CHANGED','refresh':'REFRESH_DUE'}[payload['entityType']], 'event type mismatch')
    if kind in ('Task', 'StoredResult'):
        require(payload['taskKey'] == task_key(payload['input']), 'task key mismatch')
    if kind == 'Task':
        require((payload['status'] == 'running') == (payload['leaseUntil'] is not None), 'lease state mismatch')
        require((payload['status'] == 'retry_wait') == (payload['nextAttemptAt'] is not None), 'retry schedule mismatch')
        if payload['status'] == 'running':
            require(payload['attempt'] >= 1 and payload['leaseFence'] >= 1, 'running needs attempt and fence')
    if kind == 'StoredResult':
        require(payload['resultVersion'] == result_version(payload), 'result content hash mismatch')
        require(payload['generatedAt'] == payload['input']['asOf'], 'result must use fixed snapshot time')
        require(dt(payload['generatedAt']) < dt(payload['expiresAt']), 'expired result interval')
        ids = [i['product']['id'] for i in payload['items']]
        require(len(ids) == len(set(ids)), 'duplicate stored product')
        for item in payload['items']:
            require((item['scoreType'] == 'constraints_only') == (item['relevanceScore'] is None), 'stored score mismatch')
            require(item['wantedVersion'] == payload['input']['wantedVersion'], 'stored wanted version mismatch')
            require(item['expiresAt'] == payload['expiresAt'], 'stored item expiry mismatch')
            check_reasons(item['relevanceScore'], item['explanationDetails'])
    if kind == 'NotificationIntent':
        require(payload['dedupKey'] == notification_key(payload), 'notification key mismatch')
        require(dt(payload['createdAt']) < dt(payload['expiresAt']), 'notification expired interval')


def validate_policy(policy):
    budgets = ('authorizationBudgetMs','candidateBudgetMs','baselineReserveMs','serializationReserveMs')
    for field in ('requestDeadlineMs',*budgets,'resultTtlSeconds','leaseSeconds','heartbeatSeconds','maxAttempts'):
        require(type(policy[field]) is int and policy[field] > 0, 'policy requires positive integer: '+field)
    require(sum(policy[k] for k in budgets) <= policy['requestDeadlineMs'], 'budgets exceed total deadline')
    require(policy['heartbeatSeconds'] < policy['leaseSeconds'], 'heartbeat cannot exceed lease')
    require(len(policy['retryDelaySeconds']) == policy['maxAttempts']-1, 'retry schedule length mismatch')
    require(all(type(v) is int and v > 0 for v in policy['retryDelaySeconds']), 'invalid retry delay')
    require(type(policy['notificationsEnabled']) is bool, 'notification switch must be boolean')
    if policy['notificationsEnabled']:
        value=policy['notificationThreshold']
        require(type(value) in (int,float) and 0 <= value <= 1, 'notification threshold unapproved/missing')
        for field in ('notificationCooldownSeconds','notificationDailyLimit'):
            require(type(policy[field]) is int and policy[field] > 0, 'notification policy missing: '+field)


class LifecycleModel:
    """Sequential executable specification. No evidence of actual concurrent safety.

    Inputs are already authoritative snapshots. An event is an invalidation signal,
    never a replayable source of the current product state.
    """
    def __init__(self):
        self.inbox = {}
        self.jobs = {}
        self.business_snapshots = {}
        self.current_input = None
        self.current_result = None
        self.epochs = {}
        self.last_known = {}
        self.intents = {}
        self.notifications = set()

    def observe_event(self, event):
        validate('Event', event)
        fingerprint = canonical(event)
        if event['eventId'] in self.inbox:
            require(self.inbox[event['eventId']] == fingerprint, 'EVENT_ID_CONFLICT')
            return False
        self.inbox[event['eventId']] = fingerprint
        return True

    def schedule(self, authoritative_input):
        validate_schema('InputVersion', authoritative_input)
        require(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', authoritative_input['asOf']) is not None, 'snapshot time must be canonical UTC seconds')
        key = task_key(authoritative_input)
        business_key = canonical({k:v for k,v in authoritative_input.items() if k != 'asOf'})
        if business_key in self.business_snapshots:
            require(self.business_snapshots[business_key] == authoritative_input['asOf'], 'same business version cannot change asOf')
        if self.current_input is not None:
            for field in ('wantedVersion', 'catalogRevision', 'authorizationRevision', 'policyGeneration', 'refreshGeneration'):
                require(authoritative_input[field] >= self.current_input[field], 'non-monotonic authoritative revision')
            require(authoritative_input['wantedId'] == self.current_input['wantedId'], 'model covers one wanted')
        self.business_snapshots[business_key] = authoritative_input['asOf']
        self.current_input = copy.deepcopy(authoritative_input)
        if self.current_result is not None and self.current_result['input'] != authoritative_input:
            self.current_result['state'] = 'stale'
        self.jobs.setdefault(key, {'input':copy.deepcopy(authoritative_input), 'fence':0, 'leaseUntil':0, 'attempt':0, 'status':'pending', 'result':None})
        return key

    def claim(self, key, now, lease_seconds=30):
        job = self.jobs[key]
        require(job['status'] not in ('succeeded','superseded','dead'), 'terminal job')
        require(job['leaseUntil'] <= now, 'lease held')
        job.update(fence=job['fence']+1, leaseUntil=now+lease_seconds, attempt=job['attempt']+1, status='running')
        return job['fence']

    def commit(self, key, fence, now, result):
        validate('StoredResult', result)
        job = self.jobs[key]
        require(job['status'] == 'running' and job['fence'] == fence and job['leaseUntil'] > now, 'FENCE_OR_LEASE_EXPIRED')
        require(result['input'] == job['input'] and result['taskKey'] == key, 'wrong job result')
        require(result['state'] == 'current', 'cannot commit a stale result')
        if job['input'] != self.current_input or dt(result['expiresAt']).timestamp() <= now:
            job['status']='superseded'
            return False
        job.update(status='succeeded', result=copy.deepcopy(result))
        self.current_result = copy.deepcopy(result)
        return True

    def eligibility(self, pair, state):
        require(state in ('eligible','ineligible','unknown'), 'invalid eligibility')
        if state == 'unknown':
            return self.epochs.get(pair, 0)
        if state == 'eligible' and self.last_known.get(pair) != 'eligible':
            self.epochs[pair] = self.epochs.get(pair, 0) + 1
        self.last_known[pair] = state
        return self.epochs.get(pair, 0)

    def queue_notice(self, intent, enabled=False, policy_allows=False):
        validate('NotificationIntent', intent)
        pair = (intent['wantedId'], intent['productId'])
        require(self.last_known.get(pair) == 'eligible' and intent['eligibilityEpoch'] == self.epochs.get(pair), 'invalid eligibility epoch')
        if not enabled or not policy_allows:
            return False
        self.intents.setdefault(intent['dedupKey'], copy.deepcopy(intent))
        return True

    def send_notice(self, key, now, authoritative_eligible, recipient_authorized):
        intent = self.intents[key]
        if intent['state'] == 'sent':
            return False
        pair=(intent['wantedId'],intent['productId'])
        if (intent['state'] == 'cancelled' or not authoritative_eligible or not recipient_authorized
                or dt(intent['expiresAt']).timestamp() <= now or self.epochs.get(pair) != intent['eligibilityEpoch']):
            intent['state']='cancelled'
            return False
        self.notifications.add(key)
        intent['state']='sent'
        return True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=ROOT/'contracts/m7-phase2/examples.json')
    args=parser.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding='utf-8'))
    validate_policy(json.loads((ROOT/'contracts/m7-phase2/development-policy.json').read_text(encoding='utf-8')))
    count=0
    for entry in manifest['samples']:
        path=ROOT/entry['file']
        validate(entry['schema'],json.loads(path.read_text(encoding='utf-8')))
        print('PASS',entry['file'])
        count+=1
    print(json.dumps({'status':'passed','examples':count,'scope':'synthetic contract validation only'},ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ContractError, ValueError, KeyError, OSError) as error:
        print(f'CONTRACT_CHECK_FAILED: {error}',file=sys.stderr)
        sys.exit(1)
