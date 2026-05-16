# Reputation Correction Impact Ledger

This submission targets [SCIBASE issue #15](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/15) with a focused Community & User Reputation System module.

It handles corrections, retractions, and appeals after reputation receipts already affected a profile. The original receipt remains auditable, while profile score, domain scores, and leaderboard eligibility use corrected evidence only.

## What It Adds

- Immutable receipt digests for reviews, credits, badges, endorsements, and bounty completions.
- Correction events for retractions, amended points, appeal holds, and restores.
- Transparent before/after score deltas for profile review.
- Domain score recomputation so corrected evidence is not double-counted.
- Leaderboard eligibility gating while correction or appeal risk is open.

## Demo

```powershell
node reputation-correction-impact-ledger/test.js
node reputation-correction-impact-ledger/demo.js
```

`demo.mp4` is the reviewer-facing video artifact for the bounty submission. It walks through the problem, implementation, acceptance path, and command validation in 8.4 seconds. `demo.svg` provides a static workflow diagram.

See `acceptance-notes.md` for the payout-gate evidence checklist.
