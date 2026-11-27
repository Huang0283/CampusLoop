# R2 delivery checklist — 2026-11-27

Task: [Issue #144](https://github.com/Huang0283/CampusLoop/issues/144), including the 2026-11-24 requirements.
Software SHA: `edb9e32871eac2966750993294078acbfdba65f9`.
Materials branch: `work/reporting/system-evidence` → `team/reporting`.
Receiver: R1 for assembly and language; M10 for source facts; D1 for shared figures after reception.

## R2 author delivery

| Task | File / evidence | Actual result |
|---|---|---|
| R2-01 architecture | latex/chapters/design.tex; architecture.mmd | Updated to API, DB, Redis, object storage, worker, frozen RPC, optional semantic scorer and display translation |
| R2-02 entities/permissions | Three ERD views; class-diagram.mmd; r2-model-migration-index.md and r2-source-inventory.json | 27 ORM classes and 13 upgrade bodies inventoried; optionality and conditional uniqueness reconciled |
| R2-03 six source chains | implementation.tex; architecture-source-index.md | Auth, publish, chat/offer, reservation, versioned meetup/completion/review, report and account governance mapped |
| R2-04 intelligence | ai-methods-and-limitations.tex; ai-fallback.mmd | Frozen vs live service contracts distinguished; asking-price references and synthetic demo histories explicitly bounded |
| R2-05 choices | technical-decisions.tex | Twelve sections including OpenAPI/SDK, session cookie, concurrency/idempotency, meetup version, fallback and fixed environments; alternatives identified as retrospective analysis |
| Editable figures | latex/figures/design/*.mmd and mermaid-config.json | Nine sources covering all seven required diagram types; SVG/PDF pairs exported |
| Integration aid | latex/r2-preview.tex; latex/R2-INTEGRATION.md | R2-only harness and exact assembly/build instructions; R1 files not overwritten |
| Collaboration | task-log.md; C20261103-ADMIN/system-evidence-impact.md | This revision appended; previous work retained in Git history |

Paths in the table are relative to `docs/submission/technical-report/` except collaboration records. The figure register records labels and explicit pending final numeric figure/page assignments. Detailed source anchors are in the model inventory and implementation index.

## Actual checks

- [x] Source inventory rebuilt from immutable Git objects; 27 ORM classes / 13 migrations.
- [x] All nine Mermaid sources parsed and SVG/PDF exports generated with Mermaid CLI 11.17.1.
- [x] ERD/class exports rasterized for author visual inspection; diagram orientation adjusted after the first inspection.
- [x] Static LaTeX figure paths, delimiters, labels, source-symbol and Git whitespace checks executed.
- [ ] Full R2 LaTeX preview compiled. Attempt failed before parsing the document because MiKTeX is not initialized and its user registry/configuration directory is inaccessible in this sandbox.
- [ ] Integrated A4 PDF at 100% checked for every figure. R1's main.tex/preamble.tex and final pages are not yet available in the group branch.
- [ ] Course Lecture notation checked with actual lecture title, section and page. No tracked Lecture source found; R2 needs the course material.
- [ ] Non-author review and oral explainability spot-check recorded. R1/M10 must actually perform and record it.
- [ ] U2 same-SHA screenshots received. No screenshots or human tasks are fabricated here.
- [ ] R2 revision pushed and PR accepted. Local Git push is blocked by the sandboxed credential helper; remote integration also lacks write permission.

## Receiver's first action

R1: open the four chapters and the figure register, compile r2-preview.tex from the latex directory in a configured XeLaTeX environment, and report the actual result. Then input the chapter fragments in the single main report and assign real figure numbers/pages. M10: sample four implementation chains and check the migration reconciliation. A real review link replaces the pending status only after the reviewer responds.

This is an author-prepared technical delivery awaiting the stated integration/review gates. It is not a final course submission or a model-go-live approval.
