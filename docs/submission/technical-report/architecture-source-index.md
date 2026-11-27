# R2 Architecture and Implementation Source Index

- **Verified software baseline**: `ecc22d2cb2e54de1e5ffa05ffa71b8df1ab9a1b6` (`fix: close end-to-end audit regressions`, 2026-11-25).
- **Updated**: 2026-11-27. Supersedes earlier `5fdeb0a` and `edb9e32` drafts; historical T-group test logs retain their original software SHAs.

## Reproducible Inventory and Diagram Notation

Run `python scripts/reporting_r2_sources.py` to regenerate the exact ORM class inventory and all 13 Alembic `upgrade()` bodies from immutable Git objects, and to validate all 9 figure exports, cross-references, bibliography keys, and LaTeX escaping. See [field-level source anchors](latex/r2-model-migration-index.md) and [machine-readable source inventory](latex/r2-source-inventory.json).

All nine figures live in `latex/figures/design/` as **publication-grade editable vector SVGs** (Adobe Illustrator / Figma / Inkscape editable, unified Morandi academic palette, bespoke vector icons, zero overlaps) paired with exact-bounds **true vector PDFs** (selectable text, crisp infinite zoom) and synchronized `.mmd` reference definitions.

- **ERDs** (`data-model`, `data-model-transactions`, `data-model-governance`): Crow's Foot notation (circle = zero, bar = one, crow's foot = many; dashed lines = optional/non-identifying references). Partial uniqueness is annotated explicitly as a conditional constraint rather than lifetime one-to-one cardinality. `reports.target_id` is labeled as polymorphic with no SQL foreign key.
- **Class Diagram** (`class-diagram`): UML 2.5.1 notation with hollow-triangle inheritance from `TimestampMixin` and directed associations with explicit multiplicities (`1`, `0..*`, `0..1`), mapped directly to real classes in `backend/app/models/`.
- **State and Sequence Diagrams** (`transaction-states`, `session-sequence`, `order-meetup-sequence`): UML 2.5.1 transitions with explicit guard conditions (including `ecc22d2` post-completion meetup immutability and dual-disabled dispute escalation), paired activation bars, dashed returns, and `alt` error paths.
- **Architecture and Advisory Flowcharts** (`architecture`, `ai-fallback`): four-tier layered topology and fail-closed RPC/fallback decision pipeline.

**Course Lecture locator gate**: PENDING (no tracked lecture slide files exist in the repository; R2/R1 should fill the specific lecture title/slide reference once checked against Blackboard slides).

## Figure Register

Figure labels are stable LaTeX labels. Standalone preview compilation and 100% A4 visual inspection were completed on `r2-preview.pdf`; final integrated report figure numbers and page locations will be recorded by R1 after merging into `main.tex`.

| Label | Editable source (`latex/figures/design/`) | Scope and code anchors | Vector exports | Integrated page / Lecture / non-author review |
|---|---|---|---|---|
| `fig:architecture` | `architecture.mmd` | `docker-compose.yml`; `compose.local.yml`; `core/config.py`; `worker/runner.py`; `catalog_semantic.py`; `catalog_translation_server.py` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:data-model` | `data-model.mmd` | `models/user.py`, `product.py`, `wanted.py`, `chat.py`; migrations `0001`, `0003` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:erd-transactions` | `data-model-transactions.mmd` | `models/offer.py`, `order.py`, `review.py`; migrations `0001`, `0003` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:erd-governance` | `data-model-governance.mmd` | `models/report.py`, `moderation.py`, `notification.py`, `auth.py`; migrations `0011`--`0013` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:class-diagram` | `class-diagram.mmd` | `TimestampMixin` (`mixins.py`); `User`, `Product`, `ChatSession`, `Offer`, `Order`, `Meetup` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:transaction-states` | `transaction-states.mmd` | `routes/transactions.py`; `services/order_governance.py`; `routes/admin_console.py::cancel_dispute` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:session-sequence` | `session-sequence.mmd` | `live/ChatPages.tsx`; `routes/transactions.py::create_session/list_sessions/persist_message` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:order-meetup-sequence` | `order-meetup-sequence.mmd` | `routes/transactions.py::accept_offer/save_meetup/confirm_meetup/complete_order` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |
| `fig:ai-fallback` | `ai-fallback.mmd` | `services/ai_adapters.py`; `services/catalog_semantic.py`; `services/intelligence.py`; `services/listing_price_reference.py` | `.svg` / `.pdf` | PENDING (R1) / PENDING / PENDING |

## Six End-to-End Implementation Chains (`main@ecc22d2`)

Backend route paths begin with `backend/app/api/routes/`; services with `backend/app/services/`; frontend UI paths with `frontend/src/`. SDK operations map directly to `frontend/src/sdk/generated/sdk.gen.ts`.

| Chain | UI -> SDK Operation -> Backend Handler | Persistence | Failure and Permission Boundary |
|---|---|---|---|
| Authentication | `live/AccountPages.tsx`, `sdk/index.ts::restoreIdentity` -> `login`, `refreshSession`, `restoreBrowserSession` -> `auth.py`; `services/auth.py::authenticate` | `users`, `auth_session_families`, `refresh_sessions`, `auth_audits` | Rejects untrusted `Origin`/missing `X-CampusLoop-Browser`; revokes family on replay; expired token returns `401` before disabled-account `423` appeal scope. |
| Publication | `live/MarketPages.tsx`, `live/ImageQueue.tsx` -> `uploadImage`, `createProduct` -> `market.py`; `services/storage.py::upload/owned_keys` | `uploaded_objects`, `products`, `product_images`, `idempotency_records` | Enforces 5 MiB & 25M px limits, corrupt-CRC `415` handling, EXIF stripping, ownership/purpose check, and idempotency payload hash matching. |
| Chat & Offer | `live/ChatPages.tsx::Conversation` -> `createChatSession`, `listMessages`, `sendMessage`, `createOffer` -> `transactions.py` | `chat_sessions`, `chat_messages`, `offers`, `notifications` | Blocks self-contact; checks participant; enforces `409 MESSAGE_ID_CONFLICT`; dynamically serializes past-expiry `PENDING` offers as `EXPIRED`; `closing=True` allows closing offers on reserved/disabled items. |
| Unique Reservation | `live/ChatPages.tsx` -> `acceptOffer` -> `transactions.py::accept_offer` | `offers`, `products`, `orders`, `order_events`, `idempotency_records` | Blocks proposer self-acceptance; locks `product -> offer`; Migration `0003` unique `offer_id` and partial active `product_id` index. |
| Meetup, Completion & Review | `live/TransactionPages.tsx` -> `saveMeetup`, `confirmMeetup`, `confirmOrderComplete`, `createReview` -> `transactions.py` | `meetups`, `orders`, `order_events`, `products`, `reviews` | Rejects stale meetup version (`409 MEETUP_VERSION_CONFLICT`) and post-completion meetup edits (`409 ORDER_STATE_CONFLICT`); dual completion sets `SOLD`; allows review of completed trades even if peer later disabled. |
| Governance & Appeals | `live/AdminPages.tsx`, `admin/AccountDecisionControls.tsx`, `admin/AppealsPage.tsx`, `live/ModerationPages.tsx` -> `resolveReport`, `overrideReport`, `adminCreateAccountDecision`, `submitAccountAppeal`, `adminReviewAccountAppeal` -> `governance.py`, `moderation.py`, `services/moderation.py`, `services/order_governance.py` | `reports`, `account_decisions`, `account_appeals`, `auth_audits`, `notifications` | Blocks self-reporting own message; separates triage from sanctions; allows holding `HIDDEN` products and blocks deleting held products (`409`); revokes sessions and escalates late or dual-disabled orders to `DISPUTED`; enforces independent appeal reviewer. |

## Advisory Evidence Boundaries

- Frozen M7/M8 HTTP RPC timeout: `1.5 s` (fallback on timeout, `413 SERVICE_PAYLOAD_TOO_LARGE`, `5xx`, or invalid contract). Optional live semantic BGE scorer (`live-bge-small-zh-v1`): `3.0 s` HTTP timeout with Reciprocal Rank Fusion (`k = 60`) and domain scope filtering.
- Every ranked listing ID is re-read from PostgreSQL for live public visibility and entity version prior to response serialization.
- Live 90-day asking-price quartiles (`listing_price_reference.py`, `n >= 3`, max 100 rows, up to 5 samples) are strictly separated from frozen M8 depreciation intervals (`degraded = true`, `NO_ELIGIBLE_L3_LABELS`) and never treated as completed-transaction ground truth.
- Risk clues explicitly keep uncollected signals (`failedPaymentCount24h`, `sameDeviceAccountCount7d`) as `null`, exclude `REJECTED` reports from `reportCount7d`, require an audited reason, and always emit `enforcementExecuted = false`.
- Local display translation (`HY-MT1.5-1.8B`) enforces `ALLOWED_ORIGINS`, JSON-only MIME, span masking, 10 s timeout, per-item failure isolation, and operates exclusively on public catalog text.
- Learned-model evaluation remains `NO_GO` / `NOT_EVALUATED`; synthetic demonstration data is never counted as human evaluation or L3 ground truth.

## Immutable Source Access

Baseline tree: https://github.com/Huang0283/CampusLoop/tree/ecc22d2cb2e54de1e5ffa05ffa71b8df1ab9a1b6
