"""Recovery must detect lost tables, changed facts and changed constraints."""

import copy
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "restore_verification", Path(__file__).parents[1] / "scripts/verify_restore.py"
)
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


def snapshot():
    return {
        "formatVersion": 2,
        "alembic_version": "0010",
        "tables": dict.fromkeys(restore.TABLES, 1),
        "contentHashes": dict.fromkeys(restore.TABLES, "unchanged"),
        "schemaSha256": "constraints-and-indexes",
    }


def test_unchanged_recovery_is_accepted():
    baseline = snapshot()
    assert restore.compare(copy.deepcopy(baseline), baseline) == []


def test_missing_table_on_both_sides_is_not_success():
    baseline = snapshot()
    baseline["tables"]["orders"] = None
    assert restore.compare(copy.deepcopy(baseline), baseline)


def test_same_row_counts_do_not_hide_changed_order_state():
    baseline = snapshot()
    recovered = copy.deepcopy(baseline)
    recovered["contentHashes"]["orders"] = "different-state"
    assert restore.compare(recovered, baseline)


def test_constraint_or_index_drift_is_rejected():
    baseline = snapshot()
    recovered = copy.deepcopy(baseline)
    recovered["schemaSha256"] = "missing-unique-constraint"
    assert restore.compare(recovered, baseline)


def test_old_count_only_baseline_requires_regeneration():
    baseline = snapshot()
    baseline.pop("contentHashes")
    assert restore.compare(snapshot(), baseline)
