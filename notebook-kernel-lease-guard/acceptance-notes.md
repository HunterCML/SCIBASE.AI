# Acceptance Notes

## What Changed

Added `notebook-kernel-lease-guard/`, a self-contained module for notebook kernel lease, handoff, and execution readiness in collaborative research documents.

## How To Validate

Run:

```sh
node notebook-kernel-lease-guard/test.js
node notebook-kernel-lease-guard/demo.js
```

Optional syntax check:

```sh
node --check notebook-kernel-lease-guard/index.js
node --check notebook-kernel-lease-guard/test.js
node --check notebook-kernel-lease-guard/demo.js
```

## Why This Is Issue-Specific

Issue #12 calls for embedded Jupyter notebooks, kernel management, real-time execution, inline cell comments, collaborative locks, autosave, and version tracking. This guard makes those requirements concrete by blocking unsafe notebook execution and publication when leases expire, source/output hashes drift, kernel restarts stale outputs, or unresolved cell comments remain.
