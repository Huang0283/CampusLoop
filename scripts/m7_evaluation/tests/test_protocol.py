"""Protocol fixtures are synthetic unit inputs, never submitted human evidence."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.m7_evaluation.protocol import (
    BundleError, create_template, inspect_bundle, load_snapshot, seal_bundle,
    run_snapshot, score_rankings, policy_fingerprint,
    prepare_reviews, merge_reviews,
)

ROOT=Path(__file__).resolve().parents[3]

def write(path, value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

def jsonl(path, rows):
    path.write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in rows),encoding='utf-8',newline='\n')

def fixture(root, count=100):
    """Explicit automated test fixture with declared fictional receipt strings."""
    create_template(root)
    products=[json.loads(x) for x in (ROOT/'data/m7-phase2/derived/products.jsonl').read_text(encoding='utf-8').splitlines()][:2]
    req=json.loads((ROOT/'data/m7-phase2/derived/requests.jsonl').read_text(encoding='utf-8').splitlines()[0])
    req['filters'].update(categoryId=None,minPriceFen=None,maxPriceFen=None,minCondition=None,requiredModel=None,requiredPlaceIds=[])
    products=[dict(x,visibility='public',status='ON_SALE',deleted=False) for x in products]
    sources=[dict(sourceId='unit-fixture',kind='HUMAN_AUTHORED_SCENARIO',licenseStatus='APPROVED',
                  evidence='AUTOMATED_TEST_ONLY_NOT_REAL_AUTHORIZATION'),
             dict(sourceId='unit-catalog',kind='TEAM_SYNTHETIC_CATALOG',licenseStatus='APPROVED',evidence='TEST_ONLY')]
    requests=[]
    annotations=[]
    for task in ('search','matching'):
        for n in range(count):
            r=copy.deepcopy(req)
            r.update(requestId=f'{task}-{n}',task=task,queryText=f'unit fixture {task} {n}')
            if task=='search':r['wanted']=None
            entry=dict(request=r,sourceId='unit-fixture',author='fixture-author',authoredAt='2026-10-20T08:00:00+08:00',
                       intentGroup=f'{task}-intent-{n}',slices=['fixture-slice'])
            requests.append(entry)
            for p in products:
                annotations.append(dict(requestId=r['requestId'],productId=p['productId'],reviews=[
                    dict(reviewer='fixture-reviewer-A',reviewedAt='2026-10-20T09:00:00+08:00',label=2,reason='AUTOMATED TEST FIXTURE',evidence='test-only'),
                    dict(reviewer='fixture-reviewer-B',reviewedAt='2026-10-20T10:00:00+08:00',label=2,reason='AUTOMATED TEST FIXTURE',evidence='test-only')],adjudication=None))
    jsonl(root/'products.jsonl',products)
    jsonl(root/'requests.jsonl',requests)
    jsonl(root/'annotations.jsonl',annotations)
    write(root/'sources.json',sources)
    write(root/'splits.json',dict(dev=[],test=[r['request']['requestId'] for r in requests]))
    policy=json.loads((root/'policy.json').read_text(encoding='utf-8'))
    policy.update(datasetVersion='unit-test-only-v1',labelVersion='unit-test-labels-v1',catalogSourceId='unit-catalog',
                  testExposure='NOT_PREVIOUSLY_EXECUTED',exposureEvidence='TEST_ONLY',
                  criticalSlices=['fixture-slice'],approvals={role:dict(reviewer='fixture-'+role,approvedAt='2026-10-20T11:00:00+08:00',evidence='AUTOMATED_TEST_NOT_ACTUAL_APPROVAL') for role in ('M1','M10')})
    write(root/'policy.json',policy)
    return products,requests,annotations

class ProtocolTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.bundle=self.root/'bundle'
    def tearDown(self):self.temp.cleanup()

    def test_empty_collection_template_does_not_count_as_completed_data(self):
        create_template(self.bundle)
        report=inspect_bundle(self.bundle)
        self.assertFalse(report['readyToSeal'])
        self.assertEqual(report['requestCounts'],{'search':0,'matching':0})
        self.assertFalse(report['formalAcceptance'])
        self.assertTrue(any('independent' in e for e in report['errors']))

    def test_fixed_policy_thresholds_cannot_be_overridden(self):
        fixture(self.bundle)
        policy=json.loads((self.bundle/'policy.json').read_text(encoding='utf-8'))
        policy['precisionAt5Min']=0.1
        write(self.bundle/'policy.json',policy)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_policy_receipts_and_fixed_hash_required(self):
        fixture(self.bundle)
        policy=json.loads((self.bundle/'policy.json').read_text(encoding='utf-8'))
        policy['goLivePolicySha256']='0'*64
        write(self.bundle/'policy.json',policy)
        self.assertIn('go-live policy hash',str(inspect_bundle(self.bundle)['errors']))

    def test_independent_reviewers_cannot_be_the_same_person(self):
        _,_,ann=fixture(self.bundle)
        ann[0]['reviews'][1]['reviewer']=ann[0]['reviews'][0]['reviewer']
        jsonl(self.bundle/'annotations.jsonl',ann)
        self.assertIn('independent',str(inspect_bundle(self.bundle)['errors']))

    def test_review_dates_require_real_precision_and_source_evidence(self):
        _,_,ann=fixture(self.bundle)
        ann[0]['reviews'][1]['reviewedAt']='2026-10-20'
        ann[1]['reviews'][1]['evidence']=''
        jsonl(self.bundle/'annotations.jsonl',ann)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_disagreement_requires_explicit_adjudication(self):
        _,_,ann=fixture(self.bundle)
        ann[0]['reviews'][1]['label']=1
        jsonl(self.bundle/'annotations.jsonl',ann)
        self.assertIn('adjudication',str(inspect_bundle(self.bundle)['errors']))

    def test_adjudication_time_cannot_predate_peer_review(self):
        _,_,ann=fixture(self.bundle)
        ann[0]['reviews'][1]['label']=1
        ann[0]['adjudication']=dict(reviewer='fixture-adjudicator',label=2,reason='test',reviewedAt='2026-10-19T01:00:00Z',evidence='test-only')
        jsonl(self.bundle/'annotations.jsonl',ann)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_missing_or_duplicate_qrels_rejected_before_scoring(self):
        _,_,ann=fixture(self.bundle)
        ann[-1]=ann[0]
        jsonl(self.bundle/'annotations.jsonl',ann)
        errors=str(inspect_bundle(self.bundle)['errors'])
        self.assertIn('duplicate',errors)
        self.assertIn('complete corpus',errors)

    def test_query_author_source_and_split_coverage_are_required(self):
        _,req,_=fixture(self.bundle)
        req[0]['author']=''
        req[1]['sourceId']='not-registered'
        jsonl(self.bundle/'requests.jsonl',req)
        split=json.loads((self.bundle/'splits.json').read_text(encoding='utf-8'))
        split['test'].pop()
        write(self.bundle/'splits.json',split)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_paraphrase_group_may_not_cross_dev_and_test(self):
        _,req,_=fixture(self.bundle)
        req[1]['intentGroup']=req[0]['intentGroup']
        jsonl(self.bundle/'requests.jsonl',req)
        split=json.loads((self.bundle/'splits.json').read_text(encoding='utf-8'))
        split['dev']=[split['test'].pop(0)]
        write(self.bundle/'splits.json',split)
        self.assertIn('leakage',str(inspect_bundle(self.bundle)['errors']))

    def test_repeated_query_cannot_pad_minimum_counts(self):
        _,req,_=fixture(self.bundle)
        req[1]['request']['queryText']=req[0]['request']['queryText']
        jsonl(self.bundle/'requests.jsonl',req)
        self.assertIn('duplicate query',str(inspect_bundle(self.bundle)['errors']))

    def test_unlicensed_sources_and_ai_drafts_not_eligible(self):
        fixture(self.bundle)
        write(self.bundle/'sources.json',[dict(sourceId='unit-fixture',kind='AI_ASSISTED_DRAFT',licenseStatus='PENDING',evidence='')])
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_untouched_data_with_sufficient_reviews_can_be_frozen(self):
        fixture(self.bundle)
        report=inspect_bundle(self.bundle)
        self.assertTrue(report['readyToSeal'],report['errors'])
        self.assertTrue(report['warnings'])  # P@5 upper bound < .7 is reported, never hidden.
        sealed=seal_bundle(self.bundle,self.root/'snapshot')
        self.assertEqual(sealed['status'],'SEALED_FOR_REPLAY_NOT_ACCEPTED')
        self.assertFalse(sealed['formalAcceptance'])
        self.assertIsNone(sealed['M10IndependentExecution'])
        self.assertIsNone(sealed['M1ModelDecision'])
        self.assertTrue(load_snapshot(self.root/'snapshot'))

    def test_tampered_frozen_payload_rejected(self):
        fixture(self.bundle)
        seal_bundle(self.bundle,self.root/'snapshot')
        with (self.root/'snapshot/products.jsonl').open('a') as stream:stream.write('\n')
        with self.assertRaises(BundleError):load_snapshot(self.root/'snapshot')

    def test_declared_or_replaced_file_names_cannot_escape_snapshot(self):
        fixture(self.bundle)
        seal_bundle(self.bundle,self.root/'snapshot')
        manifest=json.loads((self.root/'snapshot/freeze.json').read_text(encoding='utf-8'))
        manifest['files']['../outside.json']='0'*64
        write(self.root/'snapshot/freeze.json',manifest)
        with self.assertRaises(BundleError):load_snapshot(self.root/'snapshot')

    def test_model_is_never_loaded_from_unsealed_or_tampered_data(self):
        create_template(self.bundle)
        with patch('scripts.m7_evaluation.protocol._rank_models') as runner:
            with self.assertRaises(BundleError):run_snapshot(self.bundle,self.root/'out',model_dir=self.root/'model')
            runner.assert_not_called()
        self.assertFalse((self.root/'out').exists())

    def test_precision_has_fixed_denominator_and_unjudged_rankings_fail(self):
        requests=[dict(request=dict(requestId='q',task='search'),slices=['exact'])]
        labels={'q':{'1':2,'2':1,'3':0}}
        report=score_rankings(requests,labels,{'q':['2','1']})
        self.assertEqual(report['byTask']['search']['precisionAt5'],0.2)
        self.assertEqual(report['byTask']['search']['mrrAt10'],0.5)
        self.assertEqual(report['byTask']['search']['recallAt10'],1)
        with self.assertRaises(BundleError):score_rankings(requests,labels,{'q':['unjudged']})

    def test_unknown_labels_exclude_whole_query_and_no_answer_stays_separate(self):
        requests=[dict(request=dict(requestId=q,task='matching'),slices=['edge']) for q in ('unknown','none')]
        report=score_rankings(requests,{'unknown':{'1':'U','2':2},'none':{'1':0}},{'unknown':['2'],'none':[]})
        summary=report['byTask']['matching']
        self.assertEqual(summary['excludedRequestCount'],1)
        self.assertEqual(summary['noAnswerRequestCount'],1)
        self.assertIsNone(summary['mrrAt10'])
        self.assertEqual(summary['noAnswerEmptyAccuracy'],1)

    def test_missing_and_duplicate_run_requests_rejected(self):
        request=[dict(request=dict(requestId='q',task='search'),slices=['x'])]
        with self.assertRaises(BundleError):score_rankings(request,{'q':{'1':2}},{})
        with self.assertRaises(BundleError):score_rankings(request,{'q':{'1':2}},{'q':['1','1']})

    def test_versions_catalog_provenance_and_unseen_declaration_required(self):
        fixture(self.bundle)
        policy=json.loads((self.bundle/'policy.json').read_text(encoding='utf-8'))
        policy.update(datasetVersion='',catalogSourceId='missing',testExposure='ALREADY_EXECUTED')
        write(self.bundle/'policy.json',policy)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_runtime_changes_rejected_before_replay(self):
        fixture(self.bundle)
        seal_bundle(self.bundle,self.root/'snapshot')
        with patch('scripts.m7_evaluation.protocol._runtime_hashes',return_value={'changed':'0'*64}):
            with self.assertRaises(BundleError):load_snapshot(self.root/'snapshot')

    def test_successful_replay_never_signs_member_acceptance(self):
        products,requests,_=fixture(self.bundle)
        snapshot=self.root/'snapshot'
        seal_bundle(self.bundle,snapshot)
        rankings={name:{entry['request']['requestId']:[p['productId'] for p in products] for entry in requests} for name in ('baseline','candidate')}
        with patch('scripts.m7_evaluation.protocol._rank_models',return_value=(rankings,dict(hardConstraintViolationCounts={'search':0,'matching':0}))):
            report=run_snapshot(snapshot,self.root/'out',model_dir=self.root/'NOT_A_REAL_MODEL')
        self.assertFalse(report['qualityGatePass'])
        self.assertFalse(report['formalAcceptance'])
        self.assertEqual(report['formalDecision'],'NO_GO_PENDING_INDEPENDENT_ACCEPTANCE')
        self.assertEqual(report['comparisons']['search']['relativeMrrImprovement'],0)

    def test_positive_label_cannot_override_visibility_constraints(self):
        products,_,_=fixture(self.bundle)
        products[0]['visibility']='private'
        jsonl(self.bundle/'products.jsonl',products)
        self.assertIn('hard constraints',str(inspect_bundle(self.bundle)['errors']))

    def test_future_dated_human_evidence_is_not_accepted(self):
        _,_,ann=fixture(self.bundle)
        for a in ann:
            for r in a['reviews']:r['reviewedAt']='2099-01-01T10:00:00+08:00'
        jsonl(self.bundle/'annotations.jsonl',ann)
        policy=json.loads((self.bundle/'policy.json').read_text(encoding='utf-8'))
        for r in policy['approvals'].values():r['approvedAt']='2099-01-02T11:00:00+08:00'
        write(self.bundle/'policy.json',policy)
        self.assertFalse(inspect_bundle(self.bundle)['readyToSeal'])

    def test_blind_packets_have_no_generated_labels_or_signatures(self):
        products,requests,_=fixture(self.bundle,count=1)
        target=self.root/'packets'
        prepare_reviews(self.bundle,target)
        left=[json.loads(line) for line in (target/'reviewer-A.jsonl').read_text(encoding='utf-8').splitlines()]
        self.assertEqual(len(left),len(products)*len(requests))
        self.assertTrue(all(r['label'] is None and r['reviewer']=='' and r['reviewedAt']=='' for r in left))
        self.assertNotIn('annotations.jsonl',{p.name for p in target.iterdir()})

    def test_merging_preserves_peer_evidence_and_leaves_disagreements_unresolved(self):
        _,_,ann=fixture(self.bundle,count=1)
        left=[dict(requestId=a['requestId'],productId=a['productId'],**a['reviews'][0]) for a in ann]
        right=[dict(requestId=a['requestId'],productId=a['productId'],**a['reviews'][1]) for a in ann]
        right[0]['label']=1
        jsonl(self.root/'left.jsonl',left)
        jsonl(self.root/'right.jsonl',right)
        destination=self.root/'merged.jsonl'
        result=merge_reviews(self.bundle,self.root/'left.jsonl',self.root/'right.jsonl',destination)
        merged=[json.loads(line) for line in destination.read_text(encoding='utf-8').splitlines()]
        self.assertEqual(result['disagreementCount'],1)
        changed=next(a for a in merged if a['requestId']==ann[0]['requestId'] and a['productId']==ann[0]['productId'])
        self.assertEqual(changed['reviews'][0]['reviewer'],'fixture-reviewer-A')
        self.assertEqual(changed['reviews'][1]['label'],1)
        self.assertIsNone(changed['adjudication'])

if __name__=='__main__':unittest.main()
