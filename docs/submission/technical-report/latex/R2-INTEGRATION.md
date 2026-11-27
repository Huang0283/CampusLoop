# R2 Chapter Integration Guide (Top-Journal Edition)

## Scope and Verified Software Baseline

- **Maintained R2 technical chapters**:
  - `chapters/design.tex` (System Architecture and Design)
  - `chapters/implementation.tex` (System Implementation)
  - `chapters/ai-methods-and-limitations.tex` (Advisory Intelligence Methods and Limitations)
  - `chapters/technical-decisions.tex` (Key Architectural and Technical Decisions)
- **Bibliography fragment**: `r2-references.bib` (17 real, verified official specifications, IETF RFCs, and peer-reviewed SIGIR papers, 100% cited via `\cite{...}`). R1 should merge `r2-references.bib` into the shared `references.bib` or pass both to `\bibliography{references,r2-references}`.
- **Verified software baseline**: `main@ecc22d2cb2e54de1e5ffa05ffa71b8df1ab9a1b6` (`fix: close end-to-end audit regressions`, 2026-11-25).

## Publication-Grade Vector Figures

All nine figures under `figures/design/` are maintained as **editable publication-grade vector SVGs** (directly editable in Adobe Illustrator, Figma, or Inkscape) paired with exact-bounds **true vector PDFs** (selectable text, crisp infinite zoom, harmonious Morandi academic palette, bespoke vector icons, UML 2.5.1 and Crow's Foot notation) alongside synchronized `.mmd` backups:

- `architecture.svg` / `.pdf` — Four-tier runtime topology and authority boundaries
- `data-model.svg` / `.pdf` — ERD Part 1: Catalog, Wanted Posts, and Peer Messaging
- `data-model-transactions.svg` / `.pdf` — ERD Part 2: Offers, Orders, Meetups, Order Events, and Reviews
- `data-model-governance.svg` / `.pdf` — ERD Part 3: Reports, Account Decisions, Appeals, Notifications, and Audits
- `class-diagram.svg` / `.pdf` — UML 2.5.1 class diagram of core SQLAlchemy ORM models
- `transaction-states.svg` / `.pdf` — Authoritative order state machine and `ecc22d2` transition guards
- `session-sequence.svg` / `.pdf` — Same-peer multi-product chat and idempotent messaging sequence
- `order-meetup-sequence.svg` / `.pdf` — Offer reservation, optimistic-versioned meetup, and dual completion sequence
- `ai-fallback.svg` / `.pdf` — Three-lane advisory intelligence pipeline, fallback cascade, and `NO-GO` graduation gate

## Required Packages and Macros in R1's `preamble.tex`

R1 retains ownership of `main.tex`, `preamble.tex`, the unified Overleaf ZIP, and the final 40--60 page PDF. The four R2 chapters conform strictly to course typography rules (A4, single column, 2.54 cm margins, 12pt Times New Roman, 1.5x line spacing) and rely only on standard TeX Live / Overleaf packages:

- `fontspec`, `geometry`, `setspace` (with `\linespread{1.25}` fallback on minimal local MiKTeX)
- `amsmath`, `amssymb`, `array`, `booktabs`, `tabularx`, `enumitem`, `xcolor`, `tcolorbox`, `caption`, `graphicx`, `hyperref`
- Copy the color definitions (`clNavy`, `clAccent`, `clSlate`, `clRule`, `clSoftBg`, `clHeaderBg`, `clRose`, `clRoseBg`, `clRoseBd`), the two `tcolorbox` environments (`clbox`, `clgate`), and `\cltblhdr` from `r2-preview.tex` into `preamble.tex` so the entire Final Technical Report shares one cohesive top-journal visual identity.

## Compiling the R2 Preview Harness

Run from `docs/submission/technical-report/latex/`:

```text
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
bibtex r2-preview
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
```

Do not commit temporary auxiliary files (`*.aux`, `*.log`, `*.bbl`, `*.blg`, `*.out`, `*.toc`, `*.lof`, `*.lot`).

## Ownership and Academic Integrity Boundaries

- R1 integrates these four chapters into `main.tex`, completes the remaining chapters (Introduction, Requirements, Testing and Evaluation, Project Management, Conclusions, Appendix A), and verifies the final 40--60 body page count.
- Historical test evidence retains its original software SHA; synthetic demonstration data is never presented as human evaluation or L3 transaction ground truth.
- Learned-model deployment claims remain explicitly gated at `NO_GO` / `NOT_EVALUATED`.
- AI-assisted tooling was used during technical auditing, diagram layout refinement, and prose revision in accordance with course disclosure policy; human team members retain responsibility for technical verification, non-author review, and oral defense.
