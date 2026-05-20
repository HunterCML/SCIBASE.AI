# Repository DOI Tombstone Gate

This module adds a focused DOI tombstone and citation redirect gate for Project Repository & Version Control.

The gate evaluates whether a scientific repository version can be withdrawn, corrected, or superseded without breaking reproducibility or citation continuity. It checks:

- Immutable release snapshots with archive hash and storage URI
- DOI/DataCite target status and tombstone metadata
- Replacement DOI and snapshot hash for superseded releases
- DOI, REST API, export bundle, and cite-this-project badge redirects
- Downstream citation and fork/provenance notice packets
- Reproducibility pipeline status and failure summaries
- License, DataCite, and schema.org export metadata

## Run

```sh
node repository-doi-tombstone-gate/test.js
node repository-doi-tombstone-gate/demo.js
```

The demo writes reviewer artifacts to `repository-doi-tombstone-gate/reports/`.

## Review Surface

The implementation is dependency-free and uses synthetic data only. It does not call external APIs, read credentials, or modify repository-level configuration.
