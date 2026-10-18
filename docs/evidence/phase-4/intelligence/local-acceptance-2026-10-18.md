# M7/M8 Phase 4 Local Acceptance - 2026-10-18

## Scope

Checked the latest M7/M8 group branch snapshot `d497d62995899a2784d613814c26399bb364d943` from `origin/phase4/intelligence-models`, then applied local acceptance fixes on `fix/m7-m8-p4-acceptance`. This record covers technical behavior and regression checks only. It does not claim cross-group acceptance or close Issue #31.

## Results

- M7 semantic search: 34 unit tests passed. A missing or unreadable SQLite vector index now falls back to the filtered keyword baseline for queries and reports why; index creation/update errors still fail visibly.
- M8 price-model gate: Phase 2, Phase 3, and Phase 4 suites passed with 14, 31, and 29 tests respectively. The readiness gate remains `NO_GO` because the current approved dataset does not meet the required completed-transaction evidence. Listing prices and accepted offers are not treated as completed-sale labels.
- M8 evaluation reporting: untrained candidate metrics now report `NOT_EVALUATED` instead of copying baseline scores. Only valid `L3_COMPLETED_TRANSACTION` rows and valid prediction intervals are scored.
- Joint verification: M7 baseline, M8 regression, joint deployment, and M7 private unit-test steps all passed. The verifier reports `formalStageComplete: false`.
- Fixed BGE model inference was not rerun in this environment because the pinned model artifact is unavailable locally. Existing reported model results are therefore not claimed as reproduced by this acceptance run.

## Commands

```powershell
python -m unittest discover -s services/m7_semantic/tests -p "test_*.py" -v
python -m unittest discover -s services/m8_phase4/tests -p "test_*.py" -v
python -m services.m8_phase4.verify --output-dir C:/Users/Administrator/AppData/Local/Temp/CampusLoop-m8-p4-final-20261018 --source-commit d497d62995899a2784d613814c26399bb364d943
python -m services.intelligence_phase4.verify --output-dir C:/Users/Administrator/AppData/Local/Temp/CampusLoop-intelligence-p4-final-20261018
```

## Remaining acceptance gates

- Keep candidate deployment disabled while the readiness decision is `NO_GO`.
- Rerun pinned-model inference when the approved BGE model artifact is available and verify its recorded digest.
- Complete the M1/M10 and M8/M6/M9 human confirmations required by Issue #31.
- Do not close Issue #31 or merge the phase branch into `main` based on this local technical verification alone.
