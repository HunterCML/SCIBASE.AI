# Requirements Map

Issue #16 asks for an AI assistant suite spanning pre-submission review, reproducibility checking, and research-gap discovery.

| Issue requirement | Implementation coverage |
| --- | --- |
| Auto peer review reports | Emits reviewer findings for overclaiming, unsupported confidence, missing intervals, and missing limitations. |
| Claims vs evidence alignment | Scores evidence packets against claim wording and declared confidence. |
| Statistical or methodological red flags | Flags missing confidence intervals, weak sample evidence, and failed replication overclaiming. |
| Reproducibility checker | Converts attached replication statuses into a reproducibility confidence signal. |
| Flags discrepancies or non-determinism | Treats failed and non-deterministic reruns as claim-calibration blockers. |
| Research gap finder | Creates follow-up research opportunities for low-confidence or failed-replication claims. |
| Adaptive templates per domain | Requires manuscript domain metadata and keeps the reviewer packet domain-scoped. |

This slice is distinct from existing submissions because it focuses on uncertainty and confidence calibration, not citation matching, figure/table consistency, statistical test selection, benchmark leakage, rebuttal response planning, or generic research-gap ranking.
