# Requirements Map

Issue #10 asks for repository, versioning, collaboration, forking, in-browser diff, reproducibility, DOI/citation, and export/API support.

| Requirement | Implementation |
| --- | --- |
| Project repositories | `buildRepositoryManifest` creates a structured project manifest from typed components. |
| Version control | `diffComponents` compares component hashes and `suggestNextVersion` recommends semantic releases. |
| Collaboration and forking | `planMergeCitationImpact` checks fork parent attribution before merging derivative work. |
| In-browser diffs | The diff payload is stable JSON that a UI can render as component additions, edits, and removals. |
| Reproducibility | Merge plans hold components missing environment hashes or marked not reproducible. |
| DOI and citations | Citation changes and parent DOI records are preserved in the merge plan. |
| Export/API | `createExportAttestation` emits a compact signed-style digest for release archives or APIs. |

