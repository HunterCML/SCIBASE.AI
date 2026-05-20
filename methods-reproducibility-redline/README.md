# Methods Reproducibility Redline

This module adds a focused AI-Assisted Research Tools slice for issue #13. It is a deterministic, synthetic-data-only assistant that turns a draft manuscript into a methods reproducibility packet before human peer review.

The module covers:

- paper summaries in abstract, executive, and layperson modes
- domain inference for clinical, computational, and wet-lab drafts
- peer-review diagnostics for missing method evidence
- statistical, compliance, data, code, environment, and reagent redlines
- citation recommendations with APA, MLA, and Nature-style insertions
- reviewer tasks and audit digests for institutional review packets

This is not another broad summarizer or generic citation formatter. The slice focuses on the handoff where an AI assistant must prove that the methods section is reproducible enough for review and must show exactly which evidence or citation is missing.

## Local Validation

```sh
node methods-reproducibility-redline/test.js
node methods-reproducibility-redline/demo.js
```

## Demo Evidence

- [demo.mp4](demo.mp4) shows the problem, implementation scope, output packet, and validation commands.
- [demo.svg](demo.svg) provides a static reviewer dashboard preview.
- [requirements-map.md](requirements-map.md) maps the implementation to issue #13.
- [acceptance-notes.md](acceptance-notes.md) lists reviewer checks.
