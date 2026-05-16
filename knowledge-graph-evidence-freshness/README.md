# Knowledge Graph Evidence Freshness

This submission targets [SCIBASE issue #17](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/17) with a focused Scientific Knowledge Graph Integration module.

It evaluates whether graph edges are still safe to recommend when the papers, datasets, protocols, or replication records behind those edges become stale, corrected, superseded, retracted, or failed in replication.

## What It Adds

- Evidence-level risk scoring for retractions, corrections, supersession, stale age, failed replication, and missing evidence.
- Edge-level recommendation decisions: recommend, recommend with note, review before recommending, or suppress.
- Replacement evidence candidates for entity pages and discovery workflows.
- Review packets with stable digests so graph freshness decisions are auditable.
- Focused tests and demo data.

## Demo

```powershell
node knowledge-graph-evidence-freshness/test.js
node knowledge-graph-evidence-freshness/demo.js
```

`demo.mp4` is the reviewer-facing video artifact for the bounty submission. It walks through the problem, implementation, acceptance path, and command validation in 8.4 seconds. `demo.svg` provides a static workflow diagram.

See `acceptance-notes.md` for the payout-gate evidence checklist.
