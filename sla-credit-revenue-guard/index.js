"use strict";

const crypto = require("node:crypto");

const PLAN_RULES = {
  individualPro: {
    monthlyBaseCents: 4900,
    includedComputeUnits: 250,
    overageUnitCents: 18,
    slaPercent: 0,
    monthlyCreditCapPercent: 0,
    approvalThresholdCents: 0,
  },
  lab: {
    monthlyBaseCents: 19900,
    includedComputeUnits: 2500,
    overageUnitCents: 12,
    slaPercent: 99.5,
    monthlyCreditCapPercent: 10,
    approvalThresholdCents: 15000,
  },
  institutional: {
    monthlyBaseCents: 250000,
    includedComputeUnits: 50000,
    overageUnitCents: 7,
    slaPercent: 99.9,
    monthlyCreditCapPercent: 20,
    approvalThresholdCents: 50000,
  },
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cents(value) {
  return Math.round(Number(value || 0));
}

function formatUsd(centsValue) {
  return `$${(centsValue / 100).toFixed(2)}`;
}

function normalizePlan(plan) {
  const planKey = plan || "individualPro";
  if (!PLAN_RULES[planKey]) {
    throw new Error(`Unknown plan: ${planKey}`);
  }
  return planKey;
}

function getMonthMinutes(period) {
  if (period && Number.isFinite(period.totalMinutes)) return period.totalMinutes;
  return 30 * 24 * 60;
}

function sumIncidentMinutes(incidents) {
  return asArray(incidents).reduce((sum, incident) => sum + Number(incident.impactMinutes || 0), 0);
}

function calculateUptimePercent(period, incidents) {
  const totalMinutes = getMonthMinutes(period);
  const incidentMinutes = sumIncidentMinutes(incidents);
  return Math.max(0, ((totalMinutes - incidentMinutes) / totalMinutes) * 100);
}

function calculateServiceCredit(contract, period, incidents) {
  const plan = PLAN_RULES[normalizePlan(contract.plan)];
  if (!plan.slaPercent) {
    return {
      eligible: false,
      uptimePercent: calculateUptimePercent(period, incidents),
      creditCents: 0,
      reason: "Plan does not include an SLA credit.",
    };
  }

  const uptimePercent = calculateUptimePercent(period, incidents);
  if (uptimePercent >= plan.slaPercent) {
    return {
      eligible: false,
      uptimePercent,
      creditCents: 0,
      reason: "Measured uptime meets the contracted SLA.",
    };
  }

  const baseAmount = cents(contract.monthlyBaseCents || plan.monthlyBaseCents);
  const gap = plan.slaPercent - uptimePercent;
  const rawCreditPercent = Math.min(plan.monthlyCreditCapPercent, Math.ceil(gap * 4));
  const creditCents = Math.round(baseAmount * (rawCreditPercent / 100));

  return {
    eligible: true,
    uptimePercent,
    creditCents,
    creditPercent: rawCreditPercent,
    reason: `Uptime ${uptimePercent.toFixed(3)}% is below ${plan.slaPercent}% SLA.`,
  };
}

function meterCompute(contract, usageEvents) {
  const plan = PLAN_RULES[normalizePlan(contract.plan)];
  const units = asArray(usageEvents).reduce((sum, event) => sum + Number(event.computeUnits || 0), 0);
  const includedUnits = Number(contract.includedComputeUnits || plan.includedComputeUnits);
  const overageUnits = Math.max(0, units - includedUnits);
  const overageUnitCents = cents(contract.overageUnitCents || plan.overageUnitCents);

  return {
    units,
    includedUnits,
    overageUnits,
    overageUnitCents,
    overageCents: overageUnits * overageUnitCents,
  };
}

function validateLicensingExport(licensingExport) {
  if (!licensingExport) {
    return {
      ready: false,
      findings: [
        {
          severity: "warning",
          code: "missing-licensing-export",
          message: "No anonymized licensing API export metadata was attached to the revenue packet.",
        },
      ],
    };
  }

  const findings = [];
  if (licensingExport.privateContentIncluded) {
    findings.push({
      severity: "blocker",
      code: "private-content-in-export",
      message: "Licensing export includes private project content and must not be billed or shipped.",
    });
  }
  if (Number(licensingExport.minimumAggregationCount || 0) < 25) {
    findings.push({
      severity: "blocker",
      code: "aggregation-threshold-too-low",
      message: "Licensing export aggregation threshold is below the institutional minimum of 25.",
    });
  }
  if (!licensingExport.customerNoticeReady) {
    findings.push({
      severity: "warning",
      code: "customer-notice-missing",
      message: "Customer notice for licensing/API analytics access is not ready.",
    });
  }

  return {
    ready: findings.every((finding) => finding.severity !== "blocker"),
    findings,
  };
}

function buildInvoicePacket(input) {
  const contract = input.contract;
  const plan = PLAN_RULES[normalizePlan(contract.plan)];
  const baseCents = cents(contract.monthlyBaseCents || plan.monthlyBaseCents);
  const compute = meterCompute(contract, input.usageEvents);
  const serviceCredit = calculateServiceCredit(contract, input.period, input.incidents);
  const licensing = validateLicensingExport(input.licensingExport);

  const lines = [
    {
      code: "subscription-base",
      description: `${contract.plan} subscription base fee`,
      amountCents: baseCents,
    },
  ];

  if (compute.overageCents > 0) {
    lines.push({
      code: "ai-compute-overage",
      description: `${compute.overageUnits} AI compute units over included quota`,
      amountCents: compute.overageCents,
    });
  }

  if (serviceCredit.creditCents > 0) {
    lines.push({
      code: "sla-service-credit",
      description: `Service credit for ${serviceCredit.reason}`,
      amountCents: -serviceCredit.creditCents,
    });
  }

  if (input.licensingExport?.billableCents) {
    lines.push({
      code: "licensing-api-access",
      description: "Anonymized analytics licensing/API access",
      amountCents: cents(input.licensingExport.billableCents),
    });
  }

  const findings = [...licensing.findings];
  const approvalThresholdCents = cents(contract.approvalThresholdCents || plan.approvalThresholdCents);

  if (serviceCredit.creditCents > approvalThresholdCents && approvalThresholdCents > 0) {
    findings.push({
      severity: "warning",
      code: "finance-approval-needed",
      message: `${formatUsd(serviceCredit.creditCents)} SLA credit exceeds automatic approval threshold.`,
    });
  }

  for (const incident of asArray(input.incidents)) {
    if (!incident.postmortemReady) {
      findings.push({
        severity: "warning",
        code: "postmortem-missing",
        message: `${incident.id} needs customer-ready incident evidence before sending the invoice adjustment.`,
      });
    }
  }

  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const blockers = findings.filter((finding) => finding.severity === "blocker");

  const packet = {
    customerId: contract.customerId,
    plan: contract.plan,
    period: input.period?.id || "current",
    compute,
    serviceCredit,
    licensingReady: licensing.ready,
    lines,
    totalCents,
    total: formatUsd(totalCents),
    decision: blockers.length > 0 ? "hold" : "invoice-ready",
    findings,
  };

  return {
    ...packet,
    auditDigest: stableDigest({
      customerId: packet.customerId,
      period: packet.period,
      lines: packet.lines,
      totalCents: packet.totalCents,
      findings: packet.findings.map((finding) => finding.code),
    }),
  };
}

function evaluateRevenueGuard(input) {
  const packets = asArray(input.contracts).map((contract) =>
    buildInvoicePacket({
      contract,
      period: input.period,
      usageEvents: asArray(input.usageEvents).filter((event) => event.customerId === contract.customerId),
      incidents: asArray(input.incidents).filter((incident) =>
        asArray(incident.impactedCustomerIds).includes(contract.customerId),
      ),
      licensingExport: asArray(input.licensingExports).find((exportRow) => exportRow.customerId === contract.customerId),
    }),
  );

  const dashboard = {
    invoiceReady: packets.filter((packet) => packet.decision === "invoice-ready").length,
    held: packets.filter((packet) => packet.decision === "hold").length,
    totalBilledCents: packets.reduce((sum, packet) => sum + packet.totalCents, 0),
    totalCreditsCents: packets.reduce(
      (sum, packet) => sum + Math.abs(packet.lines.filter((line) => line.amountCents < 0).reduce((lineSum, line) => lineSum + line.amountCents, 0)),
      0,
    ),
    blockerCount: packets.flatMap((packet) => packet.findings).filter((finding) => finding.severity === "blocker").length,
    warningCount: packets.flatMap((packet) => packet.findings).filter((finding) => finding.severity === "warning").length,
  };

  return {
    dashboard: {
      ...dashboard,
      totalBilled: formatUsd(dashboard.totalBilledCents),
      totalCredits: formatUsd(dashboard.totalCreditsCents),
    },
    packets,
    auditRoot: stableDigest(packets.map((packet) => packet.auditDigest).sort()),
  };
}

module.exports = {
  PLAN_RULES,
  buildInvoicePacket,
  calculateServiceCredit,
  calculateUptimePercent,
  evaluateRevenueGuard,
  formatUsd,
  meterCompute,
  stableDigest,
  validateLicensingExport,
};
