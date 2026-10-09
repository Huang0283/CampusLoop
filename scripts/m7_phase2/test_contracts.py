"""Contract rejection tests and sequential failure-interleaving specification tests."""
import copy
import json
import unittest

from contract_check import (ROOT, ContractError, LifecycleModel, dt, validate,
                            task_key, result_version, validate_policy)


def fixture(name):
    return json.loads((ROOT/f'contracts/m7-phase2/examples/{name}.json').read_text(encoding='utf-8'))


class ContractTests(unittest.TestCase):
    def policy(self):
        return json.loads((ROOT/'contracts/m7-phase2/development-policy.json').read_text(encoding='utf-8'))

    def test_budget_reserves_fit_deadline(self):
        policy=self.policy(); validate_policy(policy)
        policy['requestDeadlineMs']=500
        with self.assertRaises(ContractError): validate_policy(policy)

    def test_notifications_cannot_enable_without_numbers(self):
        policy=self.policy(); policy['notificationsEnabled']=True
        with self.assertRaises(ContractError): validate_policy(policy)

    def test_retry_schedule_matches_attempts(self):
        policy=self.policy(); policy['maxAttempts']=4
        with self.assertRaises(ContractError): validate_policy(policy)

    def reject(self, sample, change, kind='Exchange'):
        value=fixture(sample)
        change(value)
        with self.assertRaises(ContractError):
            validate(kind,value)

    def test_all_examples(self):
        manifest=json.loads((ROOT/'contracts/m7-phase2/examples.json').read_text(encoding='utf-8'))
        self.assertGreaterEqual(len(manifest['samples']),22)
        for entry in manifest['samples']:
            with self.subTest(path=entry['file']):
                validate(entry['schema'],json.loads((ROOT/entry['file']).read_text(encoding='utf-8')))

    def test_private_nested_field_rejected(self):
        self.reject('search-success',lambda x:x['response']['data']['items'][0]['seller'].update(email='private@example.invalid'))

    def test_forged_identity_rejected(self):
        self.reject('matching-success',lambda x:x['request'].update(ownerId=21))

    def test_blank_query_rejected(self):
        self.reject('search-success',lambda x:x['request'].update(query='\u3000  '))

    def test_inverted_price_bounds_rejected(self):
        self.reject('search-success',lambda x:x['request'].update(minPriceFen=10001,maxPriceFen=10000))

    def test_unsafe_js_id_rejected(self):
        self.reject('matching-success',lambda x:x['request'].update(wantedId=9007199254740992))

    def test_later_page_requires_snapshot(self):
        self.reject('search-success',lambda x:x['request'].update(page=2))

    def test_false_success_empty_rejected(self):
        self.reject('baseline-failed',lambda x:x.update(httpStatus=200))

    def test_misleading_status_rejected(self):
        self.reject('forbidden',lambda x:x.update(httpStatus=404))

    def test_silent_fallback_rejected(self):
        self.reject('search-degraded',lambda x:x['response']['data'].update(degraded=False,degradationReason=None))

    def test_degraded_without_reason_rejected(self):
        self.reject('match-degraded',lambda x:x['response']['data'].update(degradationReason=None))

    def test_baseline_cannot_claim_model(self):
        self.reject('search-success',lambda x:x['response']['data'].update(modelVersion='fake-model'))

    def test_hundred_point_api_score_rejected(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0].update(relevanceScore=44.4))

    def test_null_requires_constraints_only(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0].update(relevanceScore=None))

    def test_constraint_cannot_inflate_score(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['explanationDetails'][0].update(contribution=0.5))

    def test_contributions_must_sum(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['explanationDetails'][1].update(contribution=0.8))

    def test_budget_reason_must_be_true(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['explanationDetails'][0].update(observed=20001))

    def test_budget_observation_matches_product(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['product'].update(price=190))

    def test_fractional_fen_rejected(self):
        self.reject('search-success',lambda x:x['response']['data']['items'][0].update(price=180.001))

    def test_sold_candidate_rejected(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['product'].update(status='SOLD'))

    def test_expiration_equality_rejected(self):
        self.reject('search-success',lambda x:x['response']['data'].update(expiresAt=x['response']['data']['generatedAt']))

    def test_timezone_required(self):
        self.reject('search-success',lambda x:x['response']['data'].update(generatedAt='2026-09-28T00:00:00'))

    def test_invalid_calendar_date_rejected(self):
        self.reject('search-success',lambda x:x['response']['data'].update(generatedAt='2026-02-30T00:00:00Z'))

    def test_reason_code_matches_field(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0]['explanationDetails'][0].update(field='text'))

    def test_mixed_versions_rejected(self):
        self.reject('matching-success',lambda x:x['response']['data']['items'][0].update(wantedVersion=2))

    def test_wrong_explanation_product_rejected(self):
        self.reject('search-success',lambda x:x['response']['data']['explanations'][0].update(productId=999))

    def test_page_total_mismatch_rejected(self):
        self.reject('search-success',lambda x:x['response']['data']['pagination'].update(total=0))

    def test_event_type_mismatch_rejected(self):
        self.reject('product-event',lambda x:x.update(eventType='WANTED_CHANGED'),'Event')

    def test_tampered_task_key_rejected(self):
        self.reject('matching-task',lambda x:x['input'].update(catalogRevision=8),'Task')

    def test_running_requires_lease(self):
        self.reject('matching-task',lambda x:x.update(leaseUntil=None),'Task')

    def test_tampered_result_rejected(self):
        self.reject('stored-result',lambda x:x['items'][0].update(relevanceScore=0.9),'StoredResult')

    def test_notice_key_includes_recipient(self):
        self.reject('notification-intent',lambda x:x.update(recipientId=99),'NotificationIntent')


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.model=LifecycleModel()
        self.result=fixture('stored-result')
        self.input=copy.deepcopy(self.result['input'])
        self.now=dt(self.input['asOf']).timestamp()

    def revised_result(self, inp):
        result=copy.deepcopy(self.result)
        result.update(input=inp,taskKey=task_key(inp),generatedAt=inp['asOf'])
        result['resultVersion']=result_version(result)
        return result

    def test_duplicate_event_and_business_version(self):
        event=fixture('product-event')
        self.assertTrue(self.model.observe_event(event))
        self.assertFalse(self.model.observe_event(event))
        event['eventId']='cdf90a9a-4775-4610-b2cb-cec6c9a49f41'
        self.assertTrue(self.model.observe_event(event))
        first=self.model.schedule(self.input)
        self.assertEqual(first,self.model.schedule(copy.deepcopy(self.input)))
        self.assertEqual(1,len(self.model.jobs))

    def test_same_event_id_different_content_rejected(self):
        event=fixture('product-event'); self.model.observe_event(event)
        event['entityVersion']+=1
        with self.assertRaisesRegex(ContractError,'EVENT_ID_CONFLICT'):
            self.model.observe_event(event)

    def test_result_is_deterministic(self):
        a=self.revised_result(self.input)
        b=self.revised_result(dict(reversed(list(self.input.items()))))
        self.assertEqual(a['resultVersion'],b['resultVersion'])

    def test_same_business_version_cannot_change_time(self):
        self.model.schedule(self.input)
        altered=copy.deepcopy(self.input); altered['asOf']='2026-09-28T00:00:01Z'
        with self.assertRaisesRegex(ContractError,'cannot change asOf'):
            self.model.schedule(altered)

    def test_explanation_changes_result_version(self):
        changed=copy.deepcopy(self.result)
        changed['items'][0]['reasons']=['另一段已审查说明']
        self.assertNotEqual(self.result['resultVersion'],result_version(changed))

    def test_new_input_invalidates_existing_result(self):
        key=self.model.schedule(self.input); fence=self.model.claim(key,self.now)
        self.model.commit(key,fence,self.now+1,self.result)
        new=copy.deepcopy(self.input); new['wantedVersion']+=1
        self.model.schedule(new)
        self.assertEqual('stale',self.model.current_result['state'])

    def test_valid_commit(self):
        key=self.model.schedule(self.input); fence=self.model.claim(key,self.now)
        self.assertTrue(self.model.commit(key,fence,self.now+1,self.result))
        self.assertEqual(self.result,self.model.current_result)

    def test_input_revision_changes_block_old_commit(self):
        for field in ('wantedVersion','catalogRevision','authorizationRevision','policyGeneration','refreshGeneration'):
            with self.subTest(field=field):
                model=LifecycleModel(); key=model.schedule(self.input); fence=model.claim(key,self.now)
                new=copy.deepcopy(self.input); new[field]+=1; model.schedule(new)
                self.assertFalse(model.commit(key,fence,self.now+1,self.result))
                self.assertIsNone(model.current_result)
                self.assertEqual('superseded',model.jobs[key]['status'])

    def test_older_event_cannot_rewind_authoritative_snapshot(self):
        newer=copy.deepcopy(self.input); newer['catalogRevision']+=1
        self.model.schedule(newer)
        old_event=fixture('product-event'); self.model.observe_event(old_event)
        self.assertEqual(newer,self.model.current_input)
        with self.assertRaises(ContractError): self.model.schedule(self.input)

    def test_lease_prevents_second_claim(self):
        key=self.model.schedule(self.input); self.model.claim(key,self.now)
        with self.assertRaises(ContractError): self.model.claim(key,self.now+1)

    def test_reclaimed_lease_fences_crashed_worker(self):
        key=self.model.schedule(self.input); old=self.model.claim(key,self.now)
        new=self.model.claim(key,self.now+31)
        with self.assertRaisesRegex(ContractError,'FENCE_OR_LEASE_EXPIRED'):
            self.model.commit(key,old,self.now+32,self.result)
        self.assertTrue(self.model.commit(key,new,self.now+32,self.result))

    def test_expired_result_never_commits(self):
        key=self.model.schedule(self.input); fence=self.model.claim(key,self.now+300)
        self.assertFalse(self.model.commit(key,fence,self.now+300,self.result))

    def test_rollback_generation_still_advances(self):
        new=copy.deepcopy(self.input); new['policyGeneration']=3
        self.model.schedule(new)
        restored=copy.deepcopy(new); restored['policyGeneration']=4
        self.assertNotEqual(task_key(new),self.model.schedule(restored))

    def test_unknown_and_score_updates_do_not_create_epoch(self):
        pair=(201,101)
        self.assertEqual(1,self.model.eligibility(pair,'eligible'))
        self.assertEqual(1,self.model.eligibility(pair,'unknown'))
        self.assertEqual(1,self.model.eligibility(pair,'eligible'))
        self.model.eligibility(pair,'ineligible')
        self.assertEqual(2,self.model.eligibility(pair,'eligible'))

    def queue(self):
        intent=fixture('notification-intent'); self.model.eligibility((201,101),'eligible')
        self.assertTrue(self.model.queue_notice(intent,enabled=True,policy_allows=True))
        return intent

    def test_notification_policy_defaults_off(self):
        intent=fixture('notification-intent'); self.model.eligibility((201,101),'eligible')
        self.assertFalse(self.model.queue_notice(intent))
        self.assertFalse(self.model.queue_notice(intent,enabled=True))
        self.assertFalse(self.model.intents)

    def test_notification_replay_is_deduplicated(self):
        intent=self.queue()
        self.model.queue_notice(intent,enabled=True,policy_allows=True)
        self.assertTrue(self.model.send_notice(intent['dedupKey'],self.now+1,True,True))
        self.assertFalse(self.model.send_notice(intent['dedupKey'],self.now+2,True,True))
        self.assertEqual(1,len(self.model.notifications))

    def test_send_rechecks_expiry_authorization_and_state(self):
        for now,eligible,authorized in ((self.now+300,True,True),(self.now+1,False,True),(self.now+1,True,False)):
            with self.subTest(now=now,eligible=eligible,authorized=authorized):
                self.model=LifecycleModel(); intent=self.queue()
                self.assertFalse(self.model.send_notice(intent['dedupKey'],now,eligible,authorized))
                self.assertFalse(self.model.notifications)

    def test_old_epoch_cannot_send_after_reeligibility(self):
        intent=self.queue(); self.model.eligibility((201,101),'ineligible'); self.model.eligibility((201,101),'eligible')
        self.assertFalse(self.model.send_notice(intent['dedupKey'],self.now+1,True,True))


if __name__ == '__main__':
    unittest.main()
