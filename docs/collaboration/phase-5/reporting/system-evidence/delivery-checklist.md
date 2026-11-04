# R2 Delivery Checklist

## Content

- [x] `design.tex` covers runtime architecture, domain model, permissions, state machine, sequences, and governance.
- [x] `implementation.tex` traces the six required source chains and operational topology.
- [x] `ai-methods-and-limitations.tex` states true inputs/outputs, validation, fallback, limitations, and go-live gates.
- [x] `technical-decisions.tex` contains at least six decisions with alternatives, trade-offs, and code evidence.
- [x] `architecture-source-index.md` pins all material claims to `5fdeb0a...`.
- [x] Six Mermaid sources exist under `figures/design/`.
- [x] Each Mermaid source has SVG and LaTeX-usable PDF export.
- [x] No model accuracy, learned-price readiness, automatic risk enforcement, or production approval is claimed.

## Local verification

- [x] Mermaid sources parsed and exported successfully.
- [x] LaTeX smoke compilation was attempted and the local-environment limitation is explicitly recorded below.
- [x] `git diff --check` passes.
- [x] Required-file and source-link checks pass.
- [x] Changes are limited to R2 report evidence and collaboration records.

Verification result:

- Mermaid CLI `11.17.1` parsed all six `.mmd` sources and generated all SVG/PDF pairs.
- `xelatex -interaction=nonstopmode -halt-on-error verify-r2.tex` was attempted with a temporary harness. The installed MiKTeX reported a fresh, unfinished setup and could not access its user registry/configuration path in the sandbox; it exited before reading the report. This is an environment failure rather than a chapter diagnostic. The temporary harness was removed.
- R2 performed static LaTeX delimiter, required-path, figure-existence, and Git whitespace checks after that attempt.
- R1 must compile the integrated report in the target Overleaf/LaTeX environment; that gate remains unchecked below.

## Integration and approval (not self-certifiable by R2)

- [ ] R1 has integrated the chapters into `main.tex` and the report archive.
- [ ] R1 has compiled the complete report in the target Overleaf/LaTeX environment.
- [ ] A non-author reviewer has checked diagrams against the pinned code baseline.
- [ ] A non-author reviewer has checked that limitations and NO-GO statements were preserved.
- [ ] M10 has completed independent acceptance where required.
- [ ] M1 has approved final submission/integration.

Unchecked items are intentional hand-off gates, not omitted work or implied approval.
