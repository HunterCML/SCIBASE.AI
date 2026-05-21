# Acceptance Notes

## What Changed

Added `uncertainty-calibration-assistant/`, a self-contained pre-submission assistant that calibrates scientific claims against evidence strength, statistical uncertainty, replication status, and limitation disclosures.

## How To Validate

Run:

```sh
node uncertainty-calibration-assistant/test.js
node uncertainty-calibration-assistant/demo.js
```

Optional syntax check:

```sh
node --check uncertainty-calibration-assistant/index.js
node --check uncertainty-calibration-assistant/test.js
node --check uncertainty-calibration-assistant/demo.js
```

## Why This Is Issue-Specific

Issue #16 explicitly calls for auto peer-review reports, claims-vs-evidence alignment, reproducibility checking, discrepancy flags, and research-gap generation. This implementation links those into a narrow uncertainty-calibration workflow: overconfident claims are rewritten, replication failures produce blockers, and low-confidence claims become research opportunities.
