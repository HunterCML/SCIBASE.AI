# Artifact Package Integrity Gate

This module adds a Scientific Data & Code Hosting slice for reviewer-ready research artifact packages. It is self-contained, dependency-free, and synthetic-data-only so reviewers can validate it without credentials, cloud storage, or a running platform.

It covers the issue #14 requirements by validating:

- datasets, notebooks, code, figures, media, and model artifacts with deterministic type classification
- metadata-aware preview plans for tabular data, notebooks, figures, JSON, model files, and deferred large payloads
- DataCite, JSON-LD, and schema.org package metadata completeness
- FAIR access requirements, reusable licenses, reviewer access evidence, version hashes, and persistent links
- pinned executable environments and rerun commands that only reference hosted artifacts
- stable export packets with package and source digests for DOI/API/archive workflows

## Local Validation

```sh
node artifact-package-integrity-gate/test.js
node artifact-package-integrity-gate/demo.js
```

## Demo Evidence

- [demo.mp4](demo.mp4) shows the problem, implementation scope, acceptance behavior, and validation commands.
- [demo.svg](demo.svg) provides a static reviewer dashboard preview.
- [requirements-map.md](requirements-map.md) maps the implementation to issue #14.
- [acceptance-notes.md](acceptance-notes.md) lists the reviewer checks.
