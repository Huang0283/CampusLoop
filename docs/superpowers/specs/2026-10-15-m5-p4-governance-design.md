# M5 Phase 4 governance design

Issue #30 defines scope: BP4-01, BP4-02 and M5's contribution to BP4-10.
Continue directly under the user's instruction to complete the deliverable.

- Keep the public trust endpoint compatible. Project results through explicit field
  allowlists; public explanations contain only completed-review aggregates. Provide
  authenticated self and administrator views. Admin reads are audited. Missing
  model service returns UNAVAILABLE, never an invented low score.
- Implement the existing report queue and resolution contract. The queue's data is
  an array, as consumed by M2. Evidence references point only to authenticated media
  routes. A nonblank handling note is mandatory. Existing users, reports,
  idempotency records and audit tables suffice; no migration is needed.
- Keep terminal report decisions immutable through normal resolve. Provide a
  separate explicit human override guarded by expected status AND handled time.
  Row locking, actor-scoped idempotency, and atomic audit writes prevent duplicate
  decisions and stale overrides. Report decisions never automatically punish users
  or change transactions/products.
- Sensitive reads record actor, purpose/reason, server timestamp, request ID and
  before/after metadata (identical for a read). Do not log evidence content or
  private chat. Account status decisions record their actual before/after states.
- Test against real PostgreSQL/Redis and M8 HTTP service, including permissions,
  neutral users, completed-review facts, model outage, idempotency, competing
  administrators, stale overrides and transaction rollback. Run existing regressions.
- M6 owns canonical OpenAPI/SDK integration; document additive routes/fields for
  handoff. M9 owns migrations/runtime. No signatures or team acceptance are inferred.

Rejected alternatives: adding a parallel moderation database would require M9
coordination without improving this scope; returning raw advisory payloads risks
unintended disclosure. Reuse existing storage and serialize safe fields explicitly.

Delivery: task/m5-p4-governance-api -> phase4/backend-integration PR, reviewed by
M6/M9 before group integration. M1 alone owns eventual merge to main.
