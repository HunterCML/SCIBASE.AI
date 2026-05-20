"use strict";

const { evaluateRevenueGuard } = require("./index");

const result = evaluateRevenueGuard({
  period: { id: "2026-05", totalMinutes: 43_200 },
  contracts: [
    {
      customerId: "midwest-university",
      plan: "institutional",
      monthlyBaseCents: 275000,
      includedComputeUnits: 50000,
      overageUnitCents: 7,
    },
  ],
  usageEvents: [
    { customerId: "midwest-university", computeUnits: 42_500 },
    { customerId: "midwest-university", computeUnits: 11_000 },
  ],
  incidents: [
    {
      id: "inc-ai-review-outage",
      impactMinutes: 75,
      impactedCustomerIds: ["midwest-university"],
      postmortemReady: true,
    },
  ],
  licensingExports: [
    {
      customerId: "midwest-university",
      billableCents: 80000,
      minimumAggregationCount: 100,
      privateContentIncluded: false,
      customerNoticeReady: true,
    },
  ],
});

console.log("SLA credit revenue guard demo");
console.log(JSON.stringify(result.dashboard, null, 2));
console.log(JSON.stringify(result.packets[0], null, 2));
