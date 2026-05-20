# SLA Credit Revenue Guard

This module adds a focused Revenue Infrastructure slice for issue #20. It evaluates institutional contracts, AI compute usage, service incidents, and anonymized licensing exports before invoice release.

It covers:

- tiered subscription plan rules for individual, lab, and institutional accounts
- AI compute usage metering, included quotas, and overage invoice lines
- SLA uptime measurement and capped service-credit calculations
- institutional invoice packets with approval and postmortem warnings
- licensing/API export readiness checks that block private content and weak aggregation
- stable audit digests for finance review and revenue operations traceability

This is not another generic billing ledger, tax module, renewal true-up, margin guard, pricing experiment, or procurement workflow. The focus is the operational revenue moment when an outage or service-level breach must be converted into an auditable credit before billing AI compute and institutional licensing access.

## Local Validation

```sh
node sla-credit-revenue-guard/test.js
node sla-credit-revenue-guard/demo.js
```

## Demo Evidence

- [demo.mp4](demo.mp4) shows the problem, implementation scope, invoice packet, and validation commands.
- [demo.svg](demo.svg) provides a static finance dashboard preview.
- [requirements-map.md](requirements-map.md) maps the implementation to issue #20.
- [acceptance-notes.md](acceptance-notes.md) lists reviewer checks.
