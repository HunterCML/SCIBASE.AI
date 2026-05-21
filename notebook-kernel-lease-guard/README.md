# Notebook Kernel Lease Guard

This module adds a focused notebook kernel lease and execution safety guard for the Real-Time Collaborative Editor.

It evaluates whether Jupyter-style notebook cells can be run or published safely in a collaborative document by checking active kernel leases, ownership handoffs, collaborator status, resource limits, stale outputs after kernel restarts, changed source hashes, and unresolved inline cell comments.

## Run

```sh
node notebook-kernel-lease-guard/test.js
node notebook-kernel-lease-guard/demo.js
```

The demo writes JSON and Markdown reviewer artifacts to `notebook-kernel-lease-guard/reports/`.

## Review Surface

The implementation is dependency-free, uses synthetic data only, and does not call external APIs or read credentials.
