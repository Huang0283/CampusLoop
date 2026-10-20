# M8 Phase 4 price evaluation and safe routing

This package implements AI4-05 through AI4-09 for M8. The current dataset gate is deliberately fail-closed: the repository contains zero approved L3 completed-transaction labels, so no regression or risk model is trained and the Phase 3 rules remain active.

Run:

```powershell
python -m unittest discover -s services/m8_phase4/tests -p "test_*.py" -v
python -m services.m8_phase4.verify --output-dir output/m8-acceptance-review --source-commit <commit>
```

`route_price` accepts a candidate only when both the data/approval gate and serving approval are true. Disabled, missing, timed-out, erroneous, empty, low-confidence, version-mismatched or invalid candidate responses fall back to the unchanged `m8-price-rule-v1` output. The router performs no business writes.

Use an empty output directory. The verifier runs Phase 2, 3 and 4 suites, archives each suite's `.txt` log and records commands, counts, return codes and SHA-256 hashes. Failure or zero collected tests prevents a successful run record. See `docs/evidence/phase-4/intelligence/m8-verification.md` for the Docker reproduction command and actual acceptance results.
