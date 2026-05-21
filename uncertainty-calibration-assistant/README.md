# Uncertainty Calibration Assistant

This module adds a focused uncertainty-calibration assistant for the AI-Powered Research Assistant Suite.

It reviews manuscript claims before submission and checks whether the wording, declared confidence, statistical evidence, replication status, and limitation disclosures agree. The assistant produces:

- calibrated claim wording
- peer-review findings for overclaiming and missing uncertainty evidence
- reproducibility confidence
- research-gap opportunities when claims are low-confidence or replication has failed
- deterministic reviewer packets and audit digests

## Run

```sh
node uncertainty-calibration-assistant/test.js
node uncertainty-calibration-assistant/demo.js
```

The demo writes JSON and Markdown reviewer artifacts to `uncertainty-calibration-assistant/reports/`.

## Review Surface

The implementation is dependency-free, uses synthetic data only, and does not call external APIs or read credentials.
