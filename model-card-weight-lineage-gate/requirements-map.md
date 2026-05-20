# Requirements Map

Issue: SCIBASE-AI/SCIBASE.AI#14, Scientific/Engineering Data & Code Hosting.

| Issue requirement | Coverage in this submission |
| --- | --- |
| Support supplementary files, models, and trained weights | `evaluateModelWeights` validates model weight path, hash, format, framework, byte size, license, and storage route evidence. |
| Metadata-aware previews | The decision output blocks unsafe model previews when model cards, licenses, embargoes, restricted data agreements, or rerun evidence are incomplete. |
| Upload versioning and diffing | Previous snapshot comparison detects weight-hash changes without model version bumps and warns when training data changes without evaluation refresh. |
| JSON-LD, DataCite, and schema.org metadata | `buildMetadata` emits DataCite-style and schema.org packets for DOI/API/archive export readiness. |
| FAIR reusable metadata and clear licensing | Model-card, dataset license, consent basis, access, and public license checks gate release readiness. |
| Executable environments | Runtime, lockfile hash, container hash, and reproduce command are required before the reproduce path is marked ready. |
| Reproducibility checks | Rerun status and expected output hashes block release when outputs drift from the reported model lineage. |
| Compute triggers and rerun buttons | The gate returns reviewer actions that determine whether reproduce buttons should be enabled, held, or metadata-only. |

## Non-Duplication Note

This slice focuses specifically on hosted model cards and trained-weight lineage. It is separate from broad FAIR manifests, artifact package integrity, preview cache, raw-instrument preview, notebook preview, retention/tombstone, storage quota, quarantine/rerun governance, and executable-environment drift submissions.
