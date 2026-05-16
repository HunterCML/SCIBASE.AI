# Challenge Amendment Consent Ledger

This submission targets [SCIBASE issue #18](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/18) with a focused Scientific Bounty System module.

It handles sponsor-side change control after a scientific bounty is already live. When a sponsor changes deliverables, rubrics, deadlines, payout schedules, private-data requirements, or IP terms, the ledger classifies the amendment, locks pre-change submission evidence, requires solver re-consent, and produces an arbitration-ready packet.

## What It Adds

- Materiality scoring for bounty amendments.
- Solver re-consent decisions for changed deliverables, criteria, deadlines, payout terms, IP terms, and private-data requirements.
- Locked evidence packets for submissions made before the amendment.
- Protected withdrawal detection when a solver already submitted work before a material scope change.
- Arbitration packet output for payout holds, safe-to-continue teams, and amendment digests.

## Demo

```powershell
node challenge-amendment-consent-ledger/test.js
node challenge-amendment-consent-ledger/demo.js
```

`demo.mp4` is the reviewer-facing video artifact for the bounty submission. It walks through the problem, implementation, acceptance path, and command validation in 8.4 seconds. `demo.svg` provides a static workflow diagram.

See `acceptance-notes.md` for the payout-gate evidence checklist.
