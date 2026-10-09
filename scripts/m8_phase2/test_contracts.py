import copy
import json
import unittest

import contract_check


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = contract_check.load(contract_check.BASE / "development-policy.json")

    def test_all_examples(self):
        for path in contract_check.EXAMPLES.glob("*.json"):
            contract_check.validate_document(contract_check.load(path), self.policy)

    def test_public_risk_leak_fails(self):
        doc = contract_check.load(contract_check.EXAMPLES / "risk-public-safe.json")
        doc["response"]["riskScore"] = 0.9
        with self.assertRaisesRegex(contract_check.ContractError, "leaked"):
            contract_check.validate_document(doc, self.policy)

    def test_risk_decision_fails(self):
        doc = contract_check.load(contract_check.EXAMPLES / "risk-admin-case.json")
        doc["response"]["decision"] = "BAN"
        with self.assertRaisesRegex(contract_check.ContractError, "cannot decide"):
            contract_check.validate_document(doc, self.policy)

    def test_new_user_prior_is_not_public_rating(self):
        doc = contract_check.load(contract_check.EXAMPLES / "trust-new-user.json")
        doc["response"]["smoothedRating"] = 4.0
        with self.assertRaisesRegex(contract_check.ContractError, "must not display"):
            contract_check.validate_document(doc, self.policy)

    def test_fallback_never_blocks(self):
        doc = contract_check.load(contract_check.EXAMPLES / "service-timeout.json")
        doc["response"]["blocksTransaction"] = True
        with self.assertRaisesRegex(contract_check.ContractError, "must not block"):
            contract_check.validate_document(doc, self.policy)


if __name__ == "__main__":
    unittest.main()
