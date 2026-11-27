# R2 chapter integration

The four cited official sources are supplied in r2-references.bib. R1 should merge those entries into its owned references.bib or add r2-references to the existing bibliography resource list. The preview uses BibTeX: run XeLaTeX, then `bibtex r2-preview`, then XeLaTeX twice. Official sections were consulted for the documented mechanisms; no publication year is guessed for rolling documentation. Human author reading/understanding remains part of the requested explainability review.

Software evidence: edb9e32871eac2966750993294078acbfdba65f9. Material revision is a separate Git commit.

The four chapter fragments are the only maintained R2 English prose source. Run from this directory:

```text
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
xelatex -interaction=nonstopmode -halt-on-error r2-preview.tex
```

The preview is a smoke-test harness, not a second final report. R1 owns main.tex, preamble.tex, final report PDF and Overleaf ZIP. In that main file, input chapters/design, chapters/implementation, chapters/ai-methods-and-limitations and chapters/technical-decisions. Preserve figures/design relative paths. The chapter files do not override the shared preamble.

Use graphicx in the main preamble. Dense diagrams may require a landscape page or further splitting after final A4 inspection; do not count vector export alone as 100% readability acceptance. The appendix-like JSON/Markdown inventories are review support and are not automatically included as report prose.

All nine .mmd files have SVG and fitted single-page PDF exports. Style is shared by figures/design/mermaid-config.json. Example rebuild with installed Mermaid CLI 11.17.1:

```text
mmdc -c figures/design/mermaid-config.json -i figures/design/architecture.mmd -o figures/design/architecture.svg -b white
mmdc -c figures/design/mermaid-config.json -i figures/design/architecture.mmd -o figures/design/architecture.pdf -b white -f
```

Repeat for the other basenames. Puppeteer can use a locally installed browser; the author used Edge with an untracked local configuration. No model weights, credentials, browser profile or node_modules belong in the report package.

The root architecture-source-index.md is the figure register. R1 should fill integrated numeric figure/page locations after assembly. Course Lecture locators and non-author reviews remain pending until supplied by real participants. No survey data or independently measured model quality is asserted. Original T-group test results retain their own software SHA; the synthetic demonstration orders do not increase the number of human evaluations or qualified price labels.

AI assistance: Codex helped inspect source, draft/revise the four chapters, prepare diagrams and run static/render checks. R2 must verify the technical meaning and be able to explain the included prose and figures. This assistance is not an independent human review or an attributable contribution by an absent member.
