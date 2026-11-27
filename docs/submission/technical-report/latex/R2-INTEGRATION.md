# R2 Chapter Integration Guide

## Scope and Verified Software Baseline

- **Maintained R2 technical chapters**:
  - `chapters/design.tex` (System Architecture and Design)
  - `chapters/implementation.tex` (System Implementation)
  - `chapters/ai-methods-and-limitations.tex` (Advisory Intelligence Methods and Limitations)
  - `chapters/technical-decisions.tex` (Key Architectural and Technical Decisions)
- **Bibliography fragment**: `r2-references.bib` (17 real, verified official specifications, RFCs, and peer-reviewed papers, all explicitly cited via `\cite{...}` across the four chapters). R1 should merge `r2-references.bib` into the shared `references.bib` or pass both files to `\bibliography{references,r2-references}`.
- **Verified software baseline**: `main@ecc22d2cb2e54de1e5ffa05ffa71b8df1ab9a1b6` (`fix: close end-to-end audit regressions`, 2026-11-25). All model fields, migrations (`0001`--`0013`), API routes, SDK operations, formulas, thresholds, timeouts, and security guards were verified directly against Git objects at this commit.

## Required Packages in R1's `preamble.tex`

R1 retains ownership of `main.tex`, `preamble.tex`, the unified Overleaf ZIP, and the final 40--60 page PDF. The four R2 chapters do not inject preamble commands and rely only on standard TeX Live / Overleaf packages:

- `fontspec` (`Times New Roman` or `Arial`, 12pt, single-column A4)
- `geometry` (`margin=2.54cm` on all four sides)
- `setspace` (`\onehalfspacing`; `r2-preview.tex` falls back cleanly to `\linespread{1.25}\selectfont` on minimal local MiKTeX installations)
- `amsmath` and `amssymb` (display equations and indicator notation for scoring, Bayesian smoothing, depreciation, and quartile rules)
- `array`, `booktabs`, and `tabularx` (structured technical tables)
- `caption` (consistent figure and table captions)
- `graphicx` (vector PDF figure inclusion under `figures/design/`)
- `hyperref` (cross-references and bibliography URLs)

Add `\emergencystretch=1.5em` in `preamble.tex` to prevent overfull lines around long monospace endpoint or symbol names.

## Compiling the R2 Preview Harness

Run from `docs/submission/technical-report/latex/`:

```text
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
bibtex r2-preview
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
```

The preview harness verifies clean XeLaTeX + BibTeX compilation, zero undefined citations or cross-references, A4 figure readability, and body page budget before R1 merges the chapters into `main.tex`. Temporary auxiliary files (`*.aux`, `*.log`, `*.bbl`, `*.blg`, `*.out`, `*.toc`, `*.lof`, `*.lot`) must not be committed.

## Regenerating Figures

All nine editable diagram sources live in `figures/design/*.mmd` alongside their shared theme (`figures/design/mermaid-config.json`) and vector exports (`.svg` and fitted single-page `.pdf`). Rebuild with Mermaid CLI 12.x (PDF auto-fits diagram bounds by default):

```text
mmdc -q -c figures/design/mermaid-config.json -i figures/design/architecture.mmd -o figures/design/architecture.svg -b white
mmdc -q -c figures/design/mermaid-config.json -i figures/design/architecture.mmd -o figures/design/architecture.pdf
```

Repeat for `data-model`, `data-model-transactions`, `data-model-governance`, `class-diagram`, `transaction-states`, `session-sequence`, `order-meetup-sequence`, and `ai-fallback`.

## Ownership and Academic Integrity Boundaries

- R1 integrates these four chapters into `main.tex`, assigns final unified figure/table numbers and page references in `architecture-source-index.md`, and completes the remaining chapters (Introduction, Requirements, Testing and Evaluation, Project Management, Conclusions, Appendix A).
- Historical test evidence retains its original software SHA; synthetic demonstration data is never presented as human evaluation or L3 transaction ground truth.
- Learned-model deployment claims remain gated at `NO_GO` until independent labeled evaluation and review sign-off are completed.
- AI-assisted drafting and editing tools were used during technical auditing, diagram layout refinement, and prose revision in accordance with course disclosure policy; human team members retain responsibility for technical verification, non-author review, and oral defense.
