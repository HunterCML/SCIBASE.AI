# Requirements Map

Target issue: [#14 Scientific/Engineering Data & Code Hosting](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/14)

## Scalable Storage Engine

- `classifyArtifact` recognizes datasets, notebooks, code, figures, media, and model artifacts by file extension.
- Artifact reports include category counts, content hashes, versions, storage tier signals, and persistent export links.
- Large artifacts are routed to deferred preview handling and object-storage policy checks.

## Metadata-Aware Previews

- Preview plans cover tabular files, spreadsheet files, JSON trees, notebooks, code viewers, image/media thumbnails, and model summaries.
- Oversized files receive asynchronous preview guidance instead of unsafe inline rendering.

## Structured Metadata And Standards

- `evaluateArtifactPackage` validates DataCite required fields, JSON-LD context/type, and schema.org type/name.
- Artifact-level metadata checks enforce titles, creators, and keywords.
- The export packet contains deterministic source and package digests for DOI/API/archive workflows.

## FAIR Compliance

- License checks require reusable licenses or explicit restriction handling.
- Restricted artifacts must include access justification and a reviewer access window.
- Persistent links are generated for each artifact in the package.
- Versioned artifacts require prior hashes for diff and rollback evidence.

## Executable Environments

- Runtime plans require pinned container images with sha256 digests.
- Rerun commands are eligible only when their declared inputs exist as hosted artifacts.
- The dashboard exposes runnable command counts and package readiness.

## Reviewer Verification

- `test.js` covers successful package readiness, file classification, metadata checks, persistent link export, broken-package blockers, and stable digest canonicalization.
- `demo.js` prints a complete synthetic package dashboard, preview plan, and export packet.
