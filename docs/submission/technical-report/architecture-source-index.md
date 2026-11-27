# R2 architecture and implementation source index

Software baseline: `edb9e32871eac2966750993294078acbfdba65f9`. Inspected on 2026-11-27. Material commit is recorded separately in Git. This supersedes the initial R2 draft's 5fdeb0a source description; historical test results retain their original SHA.

## Reproduction and notation

Run `python scripts/reporting_r2_sources.py` to reconstruct the exact model definitions and complete upgrade bodies for migrations 0001–0013 from Git objects. See [field-level source anchors](latex/r2-model-migration-index.md) and [machine-readable source inventory](latex/r2-source-inventory.json). This inspection did not run migrations against the daily database.

All maintained figure sources are now under `latex/figures/design/`. SVG/PDF exports share the same basename. The former root `figures/design/` copies are removed to prevent competing sources. Styles are defined by `mermaid-config.json`: Arial, 18px source text, white background, dark blue arrows and pale blue boxes. PDF is exported with page-fit rather than a screenshot. These are source font sizes; final A4 readability still depends on R1's placement.

ERD uses Crow's Foot: circle = zero, bar = one, crow's foot = many; dashed lines are non-identifying references. Selected fields appear on diagrams, with full column definitions in the inventory. Partial uniqueness is written as a condition, never as lifetime one-to-one cardinality. A report target is polymorphic and has no SQL FK. Class arrows use hollow-triangle inheritance and directed associations, not composition. Class associations summarize FK attributes, not invented ORM relationship objects. Sequence diagrams use participants, activation bars, calls/returns and actual error alternatives. Architecture and AI figures are engineering flowcharts, not claims of strict UML component conformance.

**Course Lecture evidence: PENDING.** No course Lecture files were found among tracked repository assets. The above legend explains the chosen notation but is not claimed as course certification. R2 must receive the actual lecture/section/page before that gate can close.

## Figure register

Figure labels are stable LaTeX labels; numeric figure numbers and integrated report pages are assigned by R1. All rows await a real non-author review and integrated A4 100% check.

| Label | Editable source (all in latex/figures/design) | Scope and code | Export | Integrated page / Lecture / reviewer |
|---|---|---|---|---|
| fig:architecture | architecture.mmd | docker-compose.yml; compose.local.yml; routes/realtime.py; worker/runner.py; catalog_semantic.py; services/catalog_translation_server.py | architecture.svg / .pdf | PENDING / PENDING / PENDING |
| fig:data-model | data-model.mmd | models/user.py, product.py, wanted.py, chat.py; 0001, 0003 | data-model.svg / .pdf | PENDING / PENDING / PENDING |
| fig:erd-transactions | data-model-transactions.mmd | models/offer.py, order.py, review.py; 0001, 0003 | data-model-transactions.svg / .pdf | PENDING / PENDING / PENDING |
| fig:erd-governance | data-model-governance.mmd | models/report.py, moderation.py, notification.py; 0011–0013 | data-model-governance.svg / .pdf | PENDING / PENDING / PENDING |
| fig:class-diagram | class-diagram.mmd | TimestampMixin in mixins.py; Product, ChatSession, Offer, Order, Meetup in named model modules | class-diagram.svg / .pdf | PENDING / PENDING / PENDING |
| fig:transaction-states | transaction-states.mmd | routes/transactions.py; services/order_governance.py; routes/admin_console.py::cancel_dispute | transaction-states.svg / .pdf | PENDING / PENDING / PENDING |
| fig:session-sequence | session-sequence.mmd | live/ChatPages.tsx::Conversation/ChatPage; routes/transactions.py::list_sessions/list_messages/persist_message | session-sequence.svg / .pdf | PENDING / PENDING / PENDING |
| fig:order-meetup-sequence | order-meetup-sequence.mmd | routes/transactions.py::accept_offer/save_meetup/confirm_meetup/complete_order | order-meetup-sequence.svg / .pdf | PENDING / PENDING / PENDING |
| fig:ai-fallback | ai-fallback.mmd | services/ai_adapters.py; services/catalog_semantic.py; services/intelligence.py; routes/intelligence.py | ai-fallback.svg / .pdf | PENDING / PENDING / PENDING |

## Six implementation chains and boundary outcomes

Paths below are relative to the repository, always at the fixed software SHA. Backend route paths begin `backend/app/api/routes/`; service paths begin `backend/app/services/`; UI paths begin `frontend/src/`. Operation names are cross-checkable in `sdk/generated/sdk.gen.ts`.

| Chain | UI → operation → backend symbol | Persistence | Failure / permission boundary |
|---|---|---|---|
| Authentication | live/AccountPages.tsx and sdk/index.ts::restoreIdentity → login / refreshSession / restoreBrowserSession → auth.py::login/refresh/restore_browser; services/auth.py::browser_session/authenticate | User, AuthSessionFamily, RefreshSession, AuthAudit | Invalid credentials, untrusted Origin/CSRF header, expired/replayed token rejected; disabled access restricted to appeal flow |
| Publication | live/MarketPages.tsx and live/ImageQueue.tsx → uploadImage / createProduct → market.py::upload_image/create_product; storage.py::owned_keys | Product, ProductImage, UploadedObject, IdempotencyRecord | Invalid or another user's object key rejected; mismatched idempotency payload conflicts |
| Chat/offer | live/ChatPages.tsx::Conversation → createChatSession / listMessages / sendMessage / createOffer → transactions.py::create_session/list_messages/persist_message/create_offer | ChatSession, ChatMessage, Offer, Notification | No self-contact; participant check; MESSAGE_ID_CONFLICT for reused ID with changed content; unavailable listing cannot be offered |
| Unique reservation | live/ChatPages.tsx → acceptOffer → transactions.py::pending_offer/accept_offer | Offer ACCEPTED, Product RESERVED, Order PENDING_CONFIRM, OrderEvent | Proposer cannot accept own offer; expired/nonpending offer conflicts; 0003 unique offer and partial active-product index plus request idempotency |
| Meetup/completion/review | live/TransactionPages.tsx → saveMeetup / confirmMeetup / confirmOrderComplete / createReview → transactions.py::save_meetup/confirm_meetup/complete_order/create_review | Meetup version, separate confirmation flags, OrderEvent, Product SOLD, Review, Notification | Old version and nonparticipants rejected; one confirmation does not finish trade; duplicate or pre-completion review rejected |
| Governance | live/AdminPages.tsx, admin/AccountDecisionControls.tsx, admin/AppealsPage.tsx and live/ModerationPages.tsx → resolveReport / overrideReport / adminCreateAccountDecision / submitAccountAppeal / adminReviewAccountAppeal → governance.py::decide; moderation.py::create_decision/submit_appeal/review; services/moderation.py::record_decision/require_independent_reviewer | Report, AccountDecision, AccountAppeal, AuthAudit, notifications; session revocation and protected order events | Report resolution does not execute enforcement; actual manual account command is separate; reason required, stale override conflicts, independent reviewer normally required |

## Per-class anchors

Every selected class and member in the class diagram is linked in `latex/r2-model-migration-index.md` to its exact class/field line. TimestampMixin is defined in `backend/app/models/mixins.py`; its `created_at` is required and `updated_at` optional. ORM models shown in the class diagram declare mapped attributes but no domain methods. SQL types and effective uniqueness belong to the ERD and migration inventory; the diagram's Numeric_10_2 label describes the mapped SQL type.

The inventory also covers all 27 ORM models, including favorites, session records, uploaded objects, read cursors, idempotency, matching jobs/results, task runs and heartbeats. These supporting records are deliberately not crowded into the core ERD.

## Advisory evidence boundaries

- Frozen M7/M8 timeout: 1.5 seconds. Optional live semantic HTTP scorer: 3 seconds, separate response contract.
- Ranked output is re-read for public visibility and entity version; private records are not returned from an advisory snapshot.
- Market reference is a 90-day, same-category/condition asking-price query. It is separate from frozen M8 rule intervals and from authorized L3 transaction labels.
- Risk clues never automatically enforce sanctions. Manual account decisions and product moderation do enforce changes and must not be described as absent.
- Translation is local display inference over public listing text, retaining original fields; it is separate from ranking evaluation.
- Demonstration histories are synthetic. Maintainer regressions, original T-group runs, human tasks, independent effect evaluation, and review approvals remain distinct.

## Source access

Immutable baseline: https://github.com/Huang0283/CampusLoop/tree/edb9e32871eac2966750993294078acbfdba65f9

The field inventory provides direct immutable line links. Complete migrations are preserved in JSON for review without relying on comments in an older README. No survey, fabricated metric, lecture locator, final page number, signature or reviewer result is supplied.
