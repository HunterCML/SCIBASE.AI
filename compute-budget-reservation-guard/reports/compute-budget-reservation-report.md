# Compute Budget Reservation Guard Demo

Decision: hold-compute-release
Audit digest: 3097df27e1490f943426267ef03818e3e7585940d329a47896daff2d4d19abc2

## Reservation Decisions

- res-folding-forecast: approved; recognized USD 3960.00; deferred USD 540.00
- res-commercial-eval: hold-reservation; recognized USD 0.00; deferred USD 4500.00
- res-unused-batch: approve-with-controls; recognized USD 0.00; deferred USD 2800.00

## Finance Actions

- defer-revenue: res-folding-forecast
- hold-grant-restricted: res-commercial-eval
- require-overrun-approval: res-commercial-eval
- defer-revenue: res-commercial-eval
- release-unused-budget: res-unused-batch
- defer-revenue: res-unused-batch

## Findings

- res-commercial-eval: warning FINANCE_APPROVAL_MISSING - Finance has not approved the reservation cap or charge route.
- res-commercial-eval: blocker GRANT_RESTRICTION_BLOCKS_WORKLOAD - The linked grant excludes commercial AI compute workloads.
- res-commercial-eval: blocker COMPUTE_OVERRUN_APPROVAL_MISSING - Actual usage is 23.3% over the reserved budget without overrun approval.
- res-commercial-eval: blocker RESTRICTED_DATA_AGREEMENT_MISSING - Restricted data compute is missing DPA or data-use-agreement evidence.
- res-commercial-eval: warning INVOICE_EVIDENCE_MISSING - The completed compute job has no invoice evidence packet.
- res-unused-batch: warning UNUSED_RESERVATION_EXPIRED - The reservation expired without usage.
