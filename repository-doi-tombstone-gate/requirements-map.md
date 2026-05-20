# Requirements Map

Issue: SCIBASE-AI/SCIBASE.AI#10, Project Repository & Version Control.

| Issue requirement | Coverage in this submission |
| --- | --- |
| Full version control, rollback, and tagging | The gate requires immutable release snapshots and blocks hash drift before a version is withdrawn, corrected, or superseded. |
| Hash-based integrity for reproducibility | Snapshot hash, current hash, replacement snapshot hash, and reproducibility run hashes are checked before transition approval. |
| Forking and provenance tracking | Fork notice packets and downstream citation notices preserve attribution for derivative repositories and cited versions. |
| In-browser/API/export continuity | DOI, REST API, export bundle, and cite-this-project badge redirects must be present before a release target changes. |
| Reproducibility pipelines | Pipeline status, last run hash, and failure summaries are required so readers understand whether the old version still reruns. |
| Repository identifiers and citation | DOI/DataCite records, replacement DOI metadata, citation badge routing, and schema.org export packets are generated for tombstone/replacement workflows. |
| Programmatic access and export bundles | Redirects keep API consumers and exported bundles pointing to either an immutable archive, tombstone page, or corrected release. |

## Non-Duplication Note

This slice focuses specifically on repository version withdrawal, DOI tombstones, and citation redirect governance. It is separate from broad repository ledgers, release engines, structured diffs, release embargo, notebook replay, schema migration, citation-impact, API/export verifier, merge queue, environment drift, and access-review submissions.
