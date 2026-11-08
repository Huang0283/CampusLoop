import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "recovery_constraints", Path(__file__).with_name("recovery_constraints.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConstraintNormalizationTests(unittest.TestCase):
    def test_dump_array_cast_is_equivalent(self):
        source = "CHECK (((role)::text = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[])))"
        restored = "CHECK (((role)::text = ANY (ARRAY[('USER'::character varying)::text, ('ADMIN'::character varying)::text])))"
        self.assertEqual(module.canonical_definition(source), module.canonical_definition(restored))

    def test_different_allowed_values_are_not_hidden(self):
        source = "CHECK (role = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[]))"
        changed = "CHECK (role = ANY ((ARRAY['USER'::character varying])::text[]))"
        self.assertNotEqual(
            module.canonical_definition(source), module.canonical_definition(changed)
        )

    def test_arbitrary_casts_and_predicates_are_preserved(self):
        for value in [
            "CHECK (price > 0)",
            "CHECK (price >= 0)",
            "CHECK (ARRAY[1,2]::integer[] IS NOT NULL)",
        ]:
            self.assertEqual(module.canonical_definition(value), value)


if __name__ == "__main__":
    unittest.main()
