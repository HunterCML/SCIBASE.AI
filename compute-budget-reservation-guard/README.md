# Compute Budget Reservation Guard

This module adds a focused revenue infrastructure guard for AI compute budget reservations.

It evaluates whether institution-sponsored GPU or AI compute reservations can be released, invoiced, or recognized as revenue by checking PI and finance approvals, grant restrictions, available budget, overrun authorization, restricted-data agreements, expired unused reservations, invoice evidence, and deferred revenue actions.

## Run

```sh
node compute-budget-reservation-guard/test.js
node compute-budget-reservation-guard/demo.js
```

The demo writes JSON and Markdown reviewer artifacts to `compute-budget-reservation-guard/reports/`.

## Review Surface

The implementation is dependency-free, uses synthetic data only, and does not call external APIs or read credentials.
