"use strict";

const assert = require("node:assert/strict");
const {
  buildInvoicePacket,
  calculateServiceCredit,
  calculateUptimePercent,
  evaluateRevenueGuard,
  formatUsd,
  meterCompute,
  stableDigest,
  validateLicensingExport,
} = require("./index");

const period = { id: "2026-05", totalMinutes: 43_200 };
const institutionalContract = {
  customerId: "university-health",
  plan: "institutional",
  monthlyBaseCents: 300000,
  includedComputeUnits: 50000,
  overageUnitCents: 6,
};

const incidents = [
  {
    id: "inc-2026-05-18",
    impactMinutes: 90,
    impactedCustomerIds: ["university-health"],
    postmortemReady: true,
  },
];

const uptime = calculateUptimePercent(period, incidents);
assert.ok(uptime < 99.9);

const credit = calculateServiceCredit(institutionalContract, period, incidents);
assert.equal(credit.eligible, true);
assert.ok(credit.creditCents > 0);
assert.ok(credit.reason.includes("below"));

const compute = meterCompute(institutionalContract, [
  { customerId: "university-health", computeUnits: 49_000 },
  { customerId: "university-health", computeUnits: 3_000 },
]);
assert.equal(compute.units, 52_000);
assert.equal(compute.overageUnits, 2_000);
assert.equal(compute.overageCents, 12000);

const packet = buildInvoicePacket({
  contract: institutionalContract,
  period,
  incidents,
  usageEvents: [
    { customerId: "university-health", computeUnits: 49_000 },
    { customerId: "university-health", computeUnits: 3_000 },
  ],
  licensingExport: {
    customerId: "university-health",
    billableCents: 65000,
    minimumAggregationCount: 50,
    privateContentIncluded: false,
    customerNoticeReady: true,
  },
});

assert.equal(packet.decision, "invoice-ready");
assert.ok(packet.lines.some((line) => line.code === "sla-service-credit" && line.amountCents < 0));
assert.ok(packet.lines.some((line) => line.code === "ai-compute-overage"));
assert.ok(packet.lines.some((line) => line.code === "licensing-api-access"));
assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);

const unsafeLicensing = validateLicensingExport({
  customerId: "agency-1",
  minimumAggregationCount: 8,
  privateContentIncluded: true,
});
assert.equal(unsafeLicensing.ready, false);
assert.equal(unsafeLicensing.findings.filter((finding) => finding.severity === "blocker").length, 2);

const guard = evaluateRevenueGuard({
  period,
  contracts: [
    institutionalContract,
    {
      customerId: "solo-researcher",
      plan: "individualPro",
      monthlyBaseCents: 4900,
      includedComputeUnits: 250,
    },
  ],
  usageEvents: [
    { customerId: "university-health", computeUnits: 52_000 },
    { customerId: "solo-researcher", computeUnits: 310 },
  ],
  incidents,
  licensingExports: [
    {
      customerId: "university-health",
      billableCents: 65000,
      minimumAggregationCount: 50,
      privateContentIncluded: false,
      customerNoticeReady: true,
    },
    {
      customerId: "solo-researcher",
      minimumAggregationCount: 4,
      privateContentIncluded: true,
    },
  ],
});

assert.equal(guard.dashboard.invoiceReady, 1);
assert.equal(guard.dashboard.held, 1);
assert.ok(guard.dashboard.blockerCount >= 2);
assert.ok(guard.dashboard.totalCreditsCents > 0);
assert.equal(formatUsd(12345), "$123.45");
assert.equal(stableDigest({ b: 2, a: 1 }), stableDigest({ a: 1, b: 2 }));

console.log("sla credit revenue guard tests passed");
