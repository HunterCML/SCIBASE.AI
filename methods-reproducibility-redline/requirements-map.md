# Requirements Map

| Issue #13 requirement | Implementation coverage |
| --- | --- |
| AI Paper Summarizer | `summarizePaper()` emits abstract, executive, and layperson summaries with evidence spans and next steps. |
| Domain-aware output | `inferDomain()` selects clinical, computational, or wet-lab review rules before scoring. |
| Key findings, implications, next steps | Summary modes include key finding text, method anchors, and next-step actions. |
| AI Peer Review Aid | `evaluateMethodReadiness()` emits reproducibility redlines, reviewer questions, and method evidence diagnostics. |
| Statistical and compliance checks | The module flags missing statistical plans, p-values without intervals, ethics gaps, data/code gaps, and missing limitations. |
| Customizable review templates | Results include domain-specific reviewer template names and required evidence sets. |
| AI Citation Tool | `buildCitationRecommendations()` recommends method, reporting, data, software, and reagent citation topics. |
| Auto-format references | `makeCitation()` formats APA, MLA, and Nature-style synthetic references. |
| One-click insertion planning | Citation recommendations include insertion hints and reviewer-ready tasks. |

## Non-goals

- No live model calls, external paper scraping, or credential handling.
- No plagiarism detection claim. This slice focuses on reproducibility and pre-review evidence readiness.
- No private or real manuscript content is included.
