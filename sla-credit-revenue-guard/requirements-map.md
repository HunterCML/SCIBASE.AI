# Requirements Map

| Issue #20 requirement | Implementation coverage |
| --- | --- |
| Tiered subscription billing | `PLAN_RULES` defines individual, lab, and institutional plan pricing, SLA, quotas, overages, caps, and approval thresholds. |
| Institutional licenses | Invoice packets are grouped by customer contract and include institutional SLA/approval behavior. |
| AI compute billing | `meterCompute()` turns usage events into quota and overage invoice lines. |
| Transparent quotas and usage meters | Each packet reports compute units, included units, overage units, unit price, and overage amount. |
| Institutional invoicing | `buildInvoicePacket()` creates base fee, overage, SLA credit, and licensing/API lines with a release decision. |
| Licensing APIs and analytics | `validateLicensingExport()` blocks private content, enforces aggregation thresholds, and tracks customer notice readiness. |
| Predictable recurring revenue controls | SLA credits are capped by plan and approval thresholds so finance can release or hold invoice adjustments. |
| Auditability | Every invoice packet and the dashboard root include stable SHA-256 digests. |

## Non-goals

- No live Stripe, PayPal, ERP, or bank integration.
- No real customer or private research data.
- No attempt to replace a full revenue-recognition close engine.
