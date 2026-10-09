import copy
import tempfile
from pathlib import Path
import unittest
import test_engine as fixtures
from services.m7_baseline.engine import ServiceError
from services.m7_baseline.store import BaselineStore


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.RankingTests()
        fixture.setUp()
        self.product, self.request, self.dictionary = fixture.product, fixture.request, fixture.dictionary
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "baseline.sqlite"

    def test_snapshot_survives_reopen_and_scans_past_revoked_product_without_duplicates(self):
        products = [copy.deepcopy(self.product) for _ in range(4)]
        for number, product in enumerate(products, 101):
            product["productId"] = str(number)
        store = BaselineStore(self.path)
        first = store.page(products, self.request, self.dictionary, size=1, now=100)
        self.assertEqual([r["productId"] for r in first["items"]], ["101"])
        products[1]["status"] = "SOLD"
        second = BaselineStore(self.path).page(products, self.request, self.dictionary, size=1,
                    snapshotVersion=first["snapshotVersion"], scanPosition=first["nextScanPosition"], now=101)
        self.assertEqual([r["productId"] for r in second["items"]], ["103"])
        self.assertEqual(second["nextScanPosition"], 3)
        self.assertFalse(second["totalIsExact"])

    def test_task_redelivery_reopens_one_result_and_conflicting_event_is_rejected(self):
        requests = [__import__("json").loads(line) for line in (fixtures.ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()]
        request = next(r for r in requests if r["requestId"] == "calculator-matching")
        request["filters"]["requiredModel"] = None
        versions = dict(wantedId=int(request["wanted"]["wantedId"]), wantedVersion=request["wanted"]["entityVersion"],
                        catalogRevision=7, authorizationRevision=3, policyGeneration=1, refreshGeneration=1,
                        asOf=request["context"]["asOf"])
        first = BaselineStore(self.path).submit("event-1", versions, [self.product], request, self.dictionary)
        second = BaselineStore(self.path).submit("event-1", versions, [self.product], request, self.dictionary)
        self.assertEqual(first["taskKey"], second["taskKey"])
        self.assertEqual(first["resultVersion"], second["resultVersion"])
        self.assertEqual(second["notificationsEnabled"], False)
        self.assertEqual(BaselineStore(self.path).read_task(first["taskKey"])["resultVersion"], first["resultVersion"])
        changed = copy.deepcopy(self.product)
        changed["priceFen"] = 18001
        with self.assertRaises(ServiceError) as caught:
            BaselineStore(self.path).submit("event-1", versions, [changed], request, self.dictionary)
        self.assertEqual(caught.exception.code, "EVENT_CONFLICT")

    def test_late_old_wanted_version_cannot_replace_current_result(self):
        requests = [__import__("json").loads(line) for line in (fixtures.ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()]
        old = next(r for r in requests if r["requestId"] == "calculator-matching")
        old["filters"]["requiredModel"] = None
        new = copy.deepcopy(old)
        new["wanted"]["entityVersion"] = 2
        versions = dict(wantedId=int(old["wanted"]["wantedId"]), wantedVersion=2,
                        catalogRevision=8, authorizationRevision=3, policyGeneration=2, refreshGeneration=1,
                        asOf=old["context"]["asOf"])
        store = BaselineStore(self.path)
        fresh = store.submit("new", versions, [self.product], new, self.dictionary)
        stale = dict(versions, wantedVersion=1, catalogRevision=7, policyGeneration=1)
        with self.assertRaises(ServiceError) as caught:
            store.submit("old", stale, [self.product], old, self.dictionary)
        self.assertEqual(caught.exception.code, "SUPERSEDED")
        self.assertEqual(store.current(versions["wantedId"])["resultVersion"], fresh["resultVersion"])

    def test_bad_product_is_quarantined_without_turning_page_into_empty_success(self):
        result = BaselineStore(self.path).page([self.product, {"broken": True}], self.request, self.dictionary)
        self.assertEqual(result["items"][0]["productId"], "101")
        self.assertEqual(result["metadata"]["quarantinedProductCount"], 1)
        with self.assertRaises(ServiceError) as caught:
            BaselineStore(self.path).page([{ "broken": True}], self.request, self.dictionary)
        self.assertEqual((caught.exception.status, caught.exception.code), (503, "DEPENDENCY_UNAVAILABLE"))

    def test_historical_task_is_marked_superseded_after_new_wanted_version(self):
        requests = [__import__("json").loads(line) for line in (fixtures.ROOT / "data/m7-phase2/derived/requests.jsonl").read_text(encoding="utf-8").splitlines()]
        request = next(r for r in requests if r["requestId"] == "calculator-matching")
        request["filters"]["requiredModel"] = None
        versions = dict(wantedId=int(request["wanted"]["wantedId"]), wantedVersion=request["wanted"]["entityVersion"],
                        catalogRevision=7, authorizationRevision=3, policyGeneration=1, refreshGeneration=1,
                        asOf=request["context"]["asOf"])
        store = BaselineStore(self.path)
        old = store.submit("first", versions, [self.product], request, self.dictionary)
        request["wanted"]["entityVersion"] += 1
        versions = dict(versions, wantedVersion=request["wanted"]["entityVersion"])
        store.submit("next", versions, [self.product], request, self.dictionary)
        historical = store.read_task(old["taskKey"])
        self.assertEqual(historical["state"], "superseded")
        self.assertEqual(historical["resultVersion"], old["resultVersion"])
