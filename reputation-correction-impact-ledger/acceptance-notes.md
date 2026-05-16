# Acceptance Notes

This is a focused implementation for SCIBASE issue #15, not a generic AI-generated content drop. The slice targets a specific reputation-system failure mode: profile scores become misleading when peer reviews, contribution credits, or reproducibility badges are corrected after they have already been counted.

## What Changed

- Added immutable receipt digests for profile reputation evidence.
- Added correction events for retractions, amended points, appeal holds, and restores.
- Added transparent before/after score deltas and per-domain recomputation.
- Added leaderboard eligibility gating while unresolved correction risk exists.
- Added focused dependency-free tests and demo data.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static workflow diagram.

## Validation

Run from the repository root:

```powershell
node reputation-correction-impact-ledger/test.js
node reputation-correction-impact-ledger/demo.js
```

Expected result: the test prints `reputation-correction-impact-ledger tests passed`, and the demo prints the original-to-corrected profile score, revoked receipts, amended receipts, appeal windows, leaderboard eligibility, and correction packet digest.

## Integration Notes

The module is dependency-free and uses plain profile receipt and correction objects. The next integration step is wiring receipts to SCIBASE review, contributor-credit, badge, and profile timeline events.
