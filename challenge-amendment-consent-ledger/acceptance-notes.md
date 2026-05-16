# Acceptance Notes

This is a focused implementation for SCIBASE issue #18, not a generic AI-generated content drop. The slice targets a specific marketplace trust problem that was not covered by the repeated broad intake, scoring, arbitration, escrow, or payout-ledger submissions already in the issue thread.

## What Changed

- Added materiality scoring for sponsor amendments after a bounty is live.
- Added solver re-consent decisions for changed deliverables, criteria, deadlines, payout terms, IP terms, and private-data requirements.
- Added locked evidence packets for submissions that existed before a material change.
- Added protected-withdrawal and payout-hold states for arbitration.
- Added focused dependency-free tests and demo data.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static workflow diagram.

## Validation

Run from the repository root:

```powershell
node challenge-amendment-consent-ledger/test.js
node challenge-amendment-consent-ledger/demo.js
```

Expected result: the test prints `challenge-amendment-consent-ledger tests passed`, and the demo prints active material amendments, protected withdrawal teams, blocked award teams, and an arbitration packet digest.

## Integration Notes

The module is dependency-free and uses plain challenge, amendment, team, and submission objects. The next integration step is wiring those objects to the SCIBASE challenge posting portal and sponsor amendment workflow.
