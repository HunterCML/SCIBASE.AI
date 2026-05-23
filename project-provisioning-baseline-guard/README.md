# Project Provisioning Baseline Guard

This module adds a focused User & Project Management guard for creating new research workspaces safely.

It evaluates whether a project can be provisioned by checking requester authority, verified institution/profile evidence, fresh MFA, required launch metadata, template controls, visibility rules by data classification, initial project roles, object-level grants, external collaborator constraints, and immutable audit evidence.

## Run

```sh
node project-provisioning-baseline-guard/test.js
node project-provisioning-baseline-guard/demo.js
node project-provisioning-baseline-guard/render-video.js
```

The demo writes JSON, Markdown, and SVG reviewer artifacts to `project-provisioning-baseline-guard/reports/`.

## Review Surface

The implementation is dependency-free, uses synthetic data only, and does not call external APIs or read credentials.
