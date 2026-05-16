# Requirements Map

| Issue requirement | Implementation |
| --- | --- |
| Challenge posting portal with deliverables and rubrics | Amendment classifier reads changed deliverables, criteria, deadlines, payout schedules, private-data requirements, and IP terms. |
| Submission engine with version control and audit logs | `lockSubmissionEvidence` preserves pre-amendment submission manifests and artifact hashes. |
| Multi-phase challenges and milestone changes | Deadline, payout schedule, and criteria changes are scored as material amendments. |
| Arbitration and reward distribution | `arbitrationPacket` lists payout holds, safe-to-continue teams, protected withdrawals, and material amendment IDs. |
| IP management options | IP term changes require explicit solver re-consent. |
| Trust for sponsors and solvers | Deterministic digests make amendment decisions and locked evidence auditable. |

## Reviewer Checklist

- Run `node challenge-amendment-consent-ledger/test.js`.
- Run `node challenge-amendment-consent-ledger/demo.js`.
- Confirm material amendments require re-consent.
- Confirm pre-change submissions are locked for protected withdrawal.
- Confirm unconsented material changes hold awards until resolved.
