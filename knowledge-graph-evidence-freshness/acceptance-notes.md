# Acceptance Notes

This is a focused implementation for SCIBASE issue #17, not a generic AI-generated content drop. The slice targets a specific knowledge-graph risk: graph edges and AI recommendations can keep pointing researchers toward outdated, corrected, retracted, or failed evidence unless freshness status is propagated into recommendation decisions.

## What Changed

- Added evidence-level risk scoring for retractions, corrections, supersession, stale age, failed replication, and missing evidence.
- Added edge-level decisions for recommendation suppression and review gating.
- Added replacement evidence candidates for entity pages and discovery flows.
- Added stable review packet digests for auditability.
- Added focused dependency-free tests and demo data.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static workflow diagram.

## Validation

Run from the repository root:

```powershell
node knowledge-graph-evidence-freshness/test.js
node knowledge-graph-evidence-freshness/demo.js
```

Expected result: the test prints `knowledge-graph-evidence-freshness tests passed`, and the demo prints suppressed edges, review-required edges, replacement candidates, and a review packet digest.

## Integration Notes

The module is dependency-free and uses plain evidence and edge objects. The next integration step is wiring these decisions into SCIBASE entity pages, graph search filters, and recommendation generation.
