# Negative Results Opportunity Radar

This submission targets [SCIBASE issue #16](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/16) with a focused AI research assistant module.

It turns negative results, limitations, and failed replications into ranked research opportunities. The goal is to help a researcher find tractable gaps that are often buried in paper discussions instead of highlighted by normal keyword search.

## What It Adds

- Signal extraction for limitations, negative results, and failed replications.
- Opportunity ranking that weighs evidence strength, lab capabilities, and researcher interests.
- Reproducibility flags for gaps backed by failed replication evidence.
- Assistant packets with peer-review prompts, citation queries, and next-step recommendations.
- Dependency-free tests and demo data that can be wired into a larger assistant/search service.

## Demo

```powershell
node negative-results-opportunity-radar/test.js
node negative-results-opportunity-radar/demo.js
```

`demo.mp4` is the reviewer-facing video artifact for the bounty submission. It walks through the problem, implementation, acceptance path, and command validation in 8.4 seconds. `demo.svg` shows the assistant flow from paper evidence to ranked opportunity and reviewer prompts.

See `acceptance-notes.md` for the payout-gate evidence checklist.
