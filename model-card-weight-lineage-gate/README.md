# Model Card Weight Lineage Gate

This module adds a focused model-card and trained-weight lineage gate for the Scientific/Engineering Data & Code Hosting bounty.

The gate evaluates hosted model weights before preview, reuse, DOI/API export, or reproduce-button enablement. It checks:

- Trained-weight artifact hash, format, framework, and storage evidence
- Model-card completeness for intended use, limitations, training data, evaluation, license, and ethical constraints
- Training-data provenance, consent basis, license, embargo, and data-use agreement evidence
- Code snapshot and executable environment hashes for reproducible reruns
- Evaluation evidence and rerun output hash consistency
- Version drift when weight hashes change without a model version bump
- DataCite and schema.org metadata export readiness

## Run

```sh
node model-card-weight-lineage-gate/test.js
node model-card-weight-lineage-gate/demo.js
```

The demo writes reviewer artifacts to `model-card-weight-lineage-gate/reports/`.

## Review Surface

The implementation is dependency-free and uses synthetic data only. It does not call external APIs, read credentials, or modify repository-level configuration.
