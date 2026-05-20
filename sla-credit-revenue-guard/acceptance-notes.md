# Acceptance Notes

Reviewer checks:

1. Run `node sla-credit-revenue-guard/test.js`.
2. Run `node sla-credit-revenue-guard/demo.js`.
3. Confirm institutional usage over quota creates an AI compute overage line.
4. Confirm SLA incidents below the contracted uptime produce capped service credits.
5. Confirm private or under-aggregated licensing exports hold the invoice.
6. Confirm audit digests remain stable for the same input.

The module is dependency-free and uses synthetic revenue events only, so it can be reviewed without payment credentials, cloud accounts, or private customer data.
