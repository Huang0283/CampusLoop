"""Boundary and reproducibility checks, not independent relevance labeling."""
from copy import deepcopy
from contextlib import contextmanager
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import pipeline as p


@contextmanager
def simulated_default_newline(default):
    """Emulate only the platform's text-write translation, not its whole runtime."""
    original=Path.open
    def platform_open(path,mode='r',buffering=-1,encoding=None,errors=None,newline=None):
        if ('w' in mode or 'a' in mode or 'x' in mode) and 'b' not in mode and newline is None:
            newline=default
        return original(path,mode,buffering,encoding,errors,newline)
    with patch.object(Path,'open',platform_open):
        yield


class DatasetTests(unittest.TestCase):
    def test_json_writers_pin_utf8_lf(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for default in ('\n','\r\n'):
                with simulated_default_newline(default):
                    p.write_json(root/'value.json',{'text':'中文\n第二行'})
                    p.write_lines(root/'rows.jsonl',[{'text':'甲'},{'text':'乙'}])
                for name in ('value.json','rows.jsonl'):
                    data=(root/name).read_bytes()
                    self.assertNotIn(b'\r',data)
                    self.assertFalse(data.startswith(b'\xef\xbb\xbf'))
                    self.assertTrue(data.endswith(b'\n'))
                    data.decode('utf-8')

    def test_rebuild_identical_under_lf_and_crlf_platform_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with simulated_default_newline('\n'):p.build(p.RAW,root/'lf')
            with simulated_default_newline('\r\n'):p.build(p.RAW,root/'crlf')
            left={f.relative_to(root/'lf').as_posix():f.read_bytes() for f in (root/'lf').rglob('*') if f.is_file()}
            right={f.relative_to(root/'crlf').as_posix():f.read_bytes() for f in (root/'crlf').rglob('*') if f.is_file()}
            self.assertEqual(left,right)
            self.assertIn('manifest.json',left)
            self.assertTrue(left['review-queue.csv'].startswith(b'\xef\xbb\xbf'))
            self.assertNotIn(b'\r',left['review-queue.csv'])
    @classmethod
    def setUpClass(cls):
        cls.products,cls.requests,cls.semantics,cls.audit,cls.dictionary,cls.schema=p.prepare(p.RAW)

    def product(self, pid):
        return deepcopy(next(r for r in self.products if r['productId']==str(pid)))

    def request(self,rid):
        return deepcopy(next(r for r in self.requests if r['requestId']==rid))

    def status(self,q,product):
        return p.hard_constraints(q,product,self.dictionary)[1]

    def bad_raw(self,filename,mutate,expected):
        with tempfile.TemporaryDirectory() as tmp:
            raw=Path(tmp)/'raw';shutil.copytree(p.RAW,raw)
            rows=p.read_lines(raw/filename);mutate(rows);p.write_lines(raw/filename,rows)
            with self.assertRaisesRegex(p.DataError,expected):p.prepare(raw)

    def test_decimal_exact_and_zero(self):
        self.assertEqual(p.to_fen('0.00'),0);self.assertEqual(p.to_fen('0.01'),1)
        self.assertEqual(p.to_fen('99.99'),9999);self.assertIsNone(p.to_fen(None))
        for value in ['1.001','-1','NaN','1e2',1.1,True,'100000000.00']:
            with self.subTest(value=value),self.assertRaises(p.DataError):p.to_fen(value)

    def test_nfkc_and_model_normalization(self):
        self.assertEqual(p.normalize(' ＴＩ-84  Plus\t'),'TI-84 Plus')
        self.assertEqual(p.fingerprint('TI-84 Plus'),p.fingerprint('ｔｉ 84 plus'))

    def test_duplicate_record_rejected(self):
        self.bad_raw('products.jsonl',lambda rows:rows.append(deepcopy(rows[0])),'duplicate raw record')

    def test_duplicate_entity_version_rejected(self):
        def mutate(rows):
            duplicate=deepcopy(rows[0]);duplicate['recordId']='another-record';rows.append(duplicate)
        self.bad_raw('products.jsonl',mutate,'duplicate product/version')

    def test_missing_required_field(self):
        self.bad_raw('products.jsonl',lambda rows:rows[0]['sourceProduct'].pop('price'),'required property')

    def test_unknown_field_rejected(self):
        self.bad_raw('products.jsonl',lambda rows:rows[0].update(secretEmail='not-allowed'),'Additional properties')

    def test_unknown_status_rejected(self):
        self.bad_raw('products.jsonl',lambda rows:rows[0]['sourceProduct'].update(status='AVAILABLE'),'not one of')

    def test_unknown_dictionary_category(self):
        self.bad_raw('requests.jsonl',lambda rows:rows[0]['filters'].update(categoryId='made-up'),'unknown filter category')

    def test_bad_timestamp_rejected(self):
        self.bad_raw('products.jsonl',lambda rows:rows[0]['sourceProduct'].update(updatedAt='2026-09-21T12:00:00'),'missing timezone')

    def test_reversed_budget_rejected(self):
        self.bad_raw('requests.jsonl',lambda rows:rows[0]['filters'].update(minPriceYuan='300.00',maxPriceYuan='200.00'),'reversed budget')

    def test_invalid_matching_context_rejected(self):
        def mutate(rows):
            next(r for r in rows if r['task']=='matching')['context']['viewerId']=None
        self.bad_raw('requests.jsonl',mutate,'authorized owner context')

    def test_missing_pair_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            raw=Path(tmp)/'raw';shutil.copytree(p.RAW,raw)
            rows=p.read_lines(raw/'semantic-drafts.jsonl');rows.pop();p.write_lines(raw/'semantic-drafts.jsonl',rows)
            asset=p.read_json(raw/'asset-manifest.json');asset['semanticPairs']=len(rows);p.write_json(raw/'asset-manifest.json',asset)
            with self.assertRaisesRegex(p.DataError,'not exhaustive'):p.prepare(raw)

    def test_latest_snapshot_and_audit(self):
        self.assertEqual(len(self.products),72);self.assertEqual(len(self.audit),12)
        self.assertEqual(self.product(101)['priceFen'],10000)
        self.assertTrue(all(r['reason']=='superseded_snapshot' for r in self.audit))

    def test_budget_edges(self):
        q=self.request('calculator-matching')
        self.assertEqual(self.status(q,self.product(101)),'eligible')
        self.assertEqual(self.status(q,self.product(102)),'eligible')
        self.assertEqual(self.status(q,self.product(104)),'ineligible')

    def test_free_is_not_missing(self):
        q=self.request('lamp-matching');product=self.product(701)
        self.assertEqual(product['priceFen'],0);self.assertEqual(self.status(q,product),'eligible')

    def test_unknown_conditions_and_models(self):
        self.assertEqual(self.status(self.request('lamp-matching'),self.product(706)),'needs_info')
        self.assertEqual(self.status(self.request('tablet-matching'),self.product(1006)),'needs_info')

    def test_failure_precedes_unknown(self):
        product=self.product(706);product['status']='SOLD'
        self.assertEqual(self.status(self.request('lamp-matching'),product),'ineligible')

    def test_permissions_and_self(self):
        self.assertEqual(self.status(self.request('bicycle-search-exact'),self.product(306)),'ineligible')
        self.assertEqual(self.status(self.request('calculus-search-exact'),self.product(406)),'ineligible')
        self.assertEqual(self.status(self.request('keyboard-matching'),self.product(506)),'ineligible')
        self.assertEqual(self.status(self.request('keyboard-search-exact'),self.product(506)),'eligible')

    def test_deleted_reserved_and_hidden(self):
        for rid,pid in [('headphones-matching',906),('camera-matching',806),('monitor-matching',206)]:
            with self.subTest(rid=rid):self.assertEqual(self.status(self.request(rid),self.product(pid)),'ineligible')

    def test_expiry_equality(self):
        self.assertEqual(self.status(self.request('tennis-matching-expired'),self.product(1201)),'ineligible')

    def test_place_and_model_mismatch(self):
        self.assertEqual(self.status(self.request('fan-matching'),self.product(606)),'ineligible')
        self.assertEqual(self.status(self.request('calculator-matching'),self.product(103)),'ineligible')

    def test_split_is_order_independent(self):
        assignments,report=p.partition(self.products,self.requests)
        reversed_assignments,_=p.partition(list(reversed(self.products)),list(reversed(self.requests)))
        self.assertEqual(assignments,reversed_assignments)
        self.assertEqual(report['crossSplitViolations'],[])
        self.assertEqual(report['componentCount'],12)

    def test_template_overlap_merges_before_split(self):
        requests=deepcopy(self.requests)
        for r in requests:
            if r['catalogId']=='catalog-monitor':r['templateGroup']='intent-calculator'
        assignment,report=p.partition(self.products,requests)
        self.assertEqual(assignment['catalog-monitor'],assignment['catalog-calculator'])
        self.assertEqual(report['componentCount'],11)

    def test_near_duplicate_overlap_merges_before_split(self):
        products=deepcopy(self.products)
        a=next(x for x in products if x['productId']=='101');b=next(x for x in products if x['productId']=='201')
        b['title']=a['title'];b['description']=a['description']
        assignment,report=p.partition(products,self.requests)
        self.assertEqual(assignment[a['catalogId']],assignment[b['catalogId']])
        self.assertTrue(any(e['reason'].startswith('normalized_text') for e in report['crossCatalogEdges']))

    def test_build_hashes_and_tamper_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'bundle'
            summary=p.build(p.RAW,out)
            self.assertTrue(p.verify(p.RAW,out)['byteIdenticalRebuild'])
            self.assertEqual(summary['noAnswerRequests'],['camera-matching-no-answer'])
            self.assertEqual(len(p.read_json(out/'exclusions.json')),3)
            with self.assertRaisesRegex(p.DataError,'must be empty'):p.build(p.RAW,out)
            with (out/'products.jsonl').open('a',encoding='utf-8') as stream:stream.write('\n')
            with self.assertRaisesRegex(p.DataError,'hash mismatch'):p.verify(p.RAW,out)

    def test_raw_tamper_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp)/'bundle';raw=Path(tmp)/'raw';shutil.copytree(p.RAW,raw)
            p.build(raw,out)
            with (raw/'products.jsonl').open('a',encoding='utf-8') as stream:stream.write('\n')
            with self.assertRaisesRegex(p.DataError,'raw hash mismatch'):p.verify(raw,out)


if __name__=='__main__':unittest.main()
