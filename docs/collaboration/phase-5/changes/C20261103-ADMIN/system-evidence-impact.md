# C20261103-ADMIN — R2 System Evidence Impact

## 2026-11-27 revision impact

Software evidence advances to edb9e32871eac2966750993294078acbfdba65f9 after explicit source inspection. Historical regression evidence is not rebound to this SHA. Four chapters now cover manual account decisions/appeals and protected orders, current report uniqueness, asking-price references, display translation, distinct live/frozen advisory timeouts and multi-product chat context.

The maintained figures move to latex/figures/design; obsolete root copies are removed. The ERD is split and a real code class diagram is added. R1 must use the new relative paths and compile before assigning final figure numbers/pages. A source inventory script reads Git objects only and neither starts services nor touches a database. No production behavior, schema or API is changed by this documentation revision.

Remaining gates are actual Lecture-source checks, final A4 figure readability, configured LaTeX compilation, non-author review and receiver acceptance. The delivery checklist records these as pending rather than silently closing them.

## Change summary

R2 adds report-only technical evidence for the Phase 5 submission. It does not change application code, database schemas, APIs, runtime configuration, model artifacts, or deployment state.

## Files and consumers

- Four LaTeX chapter fragments are consumed by R1's report `main.tex`.
- Six Mermaid sources and their SVG/PDF exports are consumed by the design and intelligence chapters.
- `architecture-source-index.md` supports reviewer traceability to `main@5fdeb0a...`.
- R2 task log and checklist support collaboration audit and hand-off.

## Behavior and compatibility impact

- Runtime behavior: none.
- API contract: none.
- Persistence/migration: none.
- UI behavior: none.
- Security/privacy behavior: none; the report documents existing boundaries without exposing credentials or private records.
- Report integration: R1 must include the four chapter files and preserve the `../figures/design/` path relative to `latex/main.tex`.

## Claims affected

The report now makes the following boundaries explicit:

- PostgreSQL remains authoritative for transactions and governance.
- Advisory service failure degrades to a checked rule baseline or an unavailable result.
- Price advice is not a trained-model deployment claim.
- Risk clues require administrator review and do not execute enforcement.
- Search, matching, price, trust, and risk still require task-specific independent evaluation before go-live claims.

## Risks and rollback

- Primary risk: R1 could drop the NO-GO or fallback language while integrating or could compile against missing figure paths.
- Mitigation: preserve the chapter text, use the pinned source index, compile the complete report, and obtain non-author review.
- Rollback: remove the R2 chapter inclusions and figure references from the report integration. No software or data rollback is required.
