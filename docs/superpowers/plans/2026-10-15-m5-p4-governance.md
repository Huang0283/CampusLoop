# M5 governance implementation plan

**Goal:** Deliver BP4-01/BP4-02 and reproducible M5 integration evidence for #30.
**Architecture:** Existing SQLAlchemy transactions, row locks and AuthAudit storage;
safe trust projection and a dedicated governance router. No shared schema migration.
**Tech stack:** FastAPI, Pydantic, PostgreSQL, Redis, pytest, Ruff.

Execute inline under the user's authorization, with checkpoints at validation.

- [x] Add `backend/app/services/governance.py`: trust projections, report DTO and
  administrator idempotency using actor lock already taken by authentication.
- [x] Add `backend/app/api/routes/governance.py`: self/admin trust; reports queue,
  resolve and compare-and-swap override. Register in `backend/app/main.py` before
  dynamic trust route. Reuse `trust_data` in intelligence without changing search.
- [x] Strengthen risk, account-status, admin-users and evidence-read audit contexts
  in the existing M5 routes; keep explicit operational read purposes compatible.
- [x] Add `backend/tests/test_governance_api.py` integration scenarios: public/self/
  admin boundaries, neutral/completed ratings, safe evidence, decisions/replays,
  competing admins, stale override, audit atomicity, risk service degradation.
- [x] Run `python -m ruff format backend`, `python -m ruff check backend`, targeted
  `python -m pytest backend/tests/test_governance_api.py -q`, then full backend and
  M7/M8 service regressions against isolated test services. Record real results.
- [x] Write trust-api.md, moderation-api.md, verification.md, deliverables.md,
  ai-integration-signoff.md and handoff.md under the Issue's evidence directory.
  Include exact contract handoff and distinguish local validation from team signoff.
- [ ] Commit, push task branch, open PR against phase4/backend-integration, inspect
  CI and fix failures. Report PR and remaining human review/integration dependencies.
