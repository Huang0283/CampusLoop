# Requirements and scope (draft)

The identifiers below reuse the project's candidate prefixes. Each requirement has a normal behavior and a failure or permission boundary. `review` means the trace is drafted but still needs the current M10 SHA and owner evidence; it does not mean the feature is approved.

| ID | Role / entry | Normal check | Failure or permission check | Status |
|---|---|---|---|---|
| AUTH-001 | Student / register | Create an account with valid fields | Duplicate or invalid account is rejected | review |
| AUTH-002 | Student / login | Valid credentials establish a session | Wrong password does not reveal account existence | review |
| AUTH-003 | Student / logout | Logout invalidates the active session | Reusing the invalidated session is rejected | review |
| AUTH-004 | Student / refresh | A valid refresh session rotates safely | Replay or concurrent replay cannot create two valid rotations | review |
| AUTH-005 | Student / profile | User edits permitted profile fields | Private email, tokens and private activity are not exposed | review |
| AUTH-006 | User/admin / protected route | Role and ownership authorize an action | A regular user cannot call an admin or another user's action | review |
| MARKET-001 | Seller / publish | Seller creates a valid listing | Invalid fields, image or ownership input is rejected | review |
| MARKET-002 | Seller / manage listing | Owner edits, publishes, hides or deletes own listing | Non-owner cannot mutate the listing | review |
| MARKET-003 | Guest/student / market | Public visitor browses visible listings and details | Hidden, deleted or private data is not exposed | review |
| MARKET-004 | Student / search | Keyword and structured filters narrow results | Empty or invalid filters return a clear result/error | review |
| MARKET-005 | Student / favorites | Student adds and removes a favorite | Unauthenticated or invalid target action is rejected | review |
| MARKET-006 | Student / wanted item | Student creates, edits, closes and expires a wanted item | Closed/expired item cannot be edited as active | review |
| TRADE-001 | Buyer/seller / chat | Authorized participants exchange persisted messages | A third party cannot read or send to the conversation | review |
| TRADE-002 | Buyer/seller / offer | Participant creates, rejects or counters an offer | Wrong role, stale offer or duplicate action is rejected | review |
| TRADE-003 | Buyer/seller / accept | One accepted offer creates one order | Concurrent acceptance cannot create duplicate orders | review |
| TRADE-004 | Buyer/seller / order | Order states follow allowed business transitions | Client cannot write an arbitrary state | review |
| TRADE-005 | Buyer/seller / meetup | Participants create and revise a meetup version | Old confirmation becomes invalid after a revision | review |
| TRADE-006 | Buyer/seller / completion | Both participants confirm the same valid version | One-sided confirmation does not complete the order | review |
| TRADE-007 | Buyer/seller / review | Each participant reviews a completed order once | Cancelled, incomplete or third-party review is rejected | review |
| TRADE-008 | Buyer/seller / cancellation | Allowed cancellation records an event and reason | Invalid state cancellation is rejected and leaves facts unchanged | review |
| AI-001 | Guest/student / search mode | Keyword search remains available when semantic service is unavailable | Fallback is identified and not presented as model success | review |
| AI-002 | Student / matching | Matching applies hard constraints before ranking | Missing, stale or unauthorized input is not treated as a valid match | review |
| AI-003 | Student / price assistance | Price assistance returns a bounded explanation or rule result | Sparse data does not become an automatic price or guarantee | review |
| AI-004 | Admin / risk and reputation | Risk clues and reputation explanations are visible to the proper role | Model output alone cannot disable or punish an account | review |
| ADMIN-001 | Student/admin / report | Student submits and later views own report; admin handles it | Unrelated student cannot read evidence or admin queue | review |
| ADMIN-002 | Admin / governance | Admin decision records reason, actor, time and before/after | Missing audit context or stale decision is rejected | review |
| ADMIN-003 | Student/admin / notification | Business and report outcomes create traceable notifications | Duplicate events do not duplicate effective notifications | review |
| ADMIN-004 | Admin / dashboard and audit query | Authorized administrator views bounded operational statistics and decision history | Non-admin access is rejected and sensitive audit data is not exposed | review |
| QUALITY-001 | Operator / deployment | Non-author can configure and start required services | Missing secret, dependency or health check stops clearly | review |
| QUALITY-002 | Maintainer / release | CI, migration, recovery and evidence commands are reproducible | Failed checks cannot be silently described as passed | review |

The final version must add test case IDs, evidence paths, exact software SHA, reviewer and current result for every row. The table intentionally contains no invented pass count.
