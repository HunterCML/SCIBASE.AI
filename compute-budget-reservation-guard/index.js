const crypto = require("crypto");

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function toCents(value) {
  const number = Number(value || 0);
  return Math.round(number * 100);
}

function fromCents(value) {
  return Math.round(value) / 100;
}

function moneyLabel(cents, currency) {
  return `${currency || "USD"} ${fromCents(cents).toFixed(2)}`;
}

function indexById(items) {
  return asArray(items).reduce((acc, item) => {
    if (item && item.id) acc[item.id] = item;
    return acc;
  }, {});
}

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

function hasApproval(reservation, role) {
  return asArray(reservation.approvals).some((approval) => normalize(approval.role) === normalize(role) && approval.approvedAt);
}

function computeRequestedCents(reservation) {
  if (reservation.requestedBudget != null) return toCents(reservation.requestedBudget);
  const units = Number(reservation.requestedUnits || 0);
  const unitPrice = Number(reservation.unitPrice || reservation.unitCost || 0);
  return toCents(units * unitPrice);
}

function computeActualCents(reservation) {
  if (reservation.actualCost != null) return toCents(reservation.actualCost);
  const units = Number(reservation.actualUnits || reservation.usedUnits || 0);
  const unitPrice = Number(reservation.unitPrice || reservation.unitCost || 0);
  return toCents(units * unitPrice);
}

function evaluateReservation(reservation, context) {
  const now = context.now;
  const currency = reservation.currency || context.currency || "USD";
  const grant = context.grants[reservation.grantId] || reservation.grant || {};
  const requestedCents = computeRequestedCents(reservation);
  const actualCents = computeActualCents(reservation);
  const capCents = toCents(reservation.budgetCap || grant.remainingBudget || grant.awardBalance || 0);
  const allowedOverrunPercent = Number(reservation.allowedOverrunPercent ?? grant.allowedOverrunPercent ?? 0);
  const findings = [];
  const actions = [];
  const evidenceIds = asArray(reservation.evidenceIds);
  const invoiceEvidence = asArray(reservation.invoice && reservation.invoice.evidenceIds);
  const expiresAt = parseDate(reservation.expiresAt);
  const completed = normalize(reservation.job && reservation.job.status) === "completed";
  const restrictedWorkload = asArray(grant.restrictions).some((restriction) => {
    const key = normalize(restriction);
    return key === "no-commercial-ai" && normalize(reservation.workloadType).includes("commercial");
  });

  if (!reservation.id || !reservation.projectId) {
    addFinding(
      findings,
      "blocker",
      "RESERVATION_CONTEXT_MISSING",
      "Reservation id and project id are required before revenue or compute access can be evaluated.",
      "Attach a stable reservation id and project id to the compute budget packet.",
    );
  }

  if (!hasApproval(reservation, "pi")) {
    addFinding(
      findings,
      "blocker",
      "PI_APPROVAL_MISSING",
      "The compute reservation is missing principal investigator approval.",
      "Collect PI approval before accepting a sponsored AI compute reservation.",
    );
  }

  if (!hasApproval(reservation, "finance")) {
    addFinding(
      findings,
      "warning",
      "FINANCE_APPROVAL_MISSING",
      "Finance has not approved the reservation cap or charge route.",
      "Route the reservation through finance approval before the job starts or invoices are created.",
    );
  }

  if (restrictedWorkload) {
    addFinding(
      findings,
      "blocker",
      "GRANT_RESTRICTION_BLOCKS_WORKLOAD",
      "The linked grant excludes commercial AI compute workloads.",
      "Move the job to an eligible funding source or change the workload classification.",
    );
    actions.push({ type: "hold-grant-restricted", reservationId: reservation.id, grantId: grant.id || reservation.grantId });
  }

  if (capCents > 0 && requestedCents > capCents) {
    addFinding(
      findings,
      "blocker",
      "REQUEST_EXCEEDS_AVAILABLE_BUDGET",
      `${moneyLabel(requestedCents, currency)} requested exceeds the available cap ${moneyLabel(capCents, currency)}.`,
      "Reduce the reservation or attach an approved budget increase before compute is released.",
    );
  }

  if (actualCents > requestedCents && requestedCents > 0) {
    const overrunPercent = ((actualCents - requestedCents) / requestedCents) * 100;
    if (overrunPercent > allowedOverrunPercent && !hasApproval(reservation, "overrun")) {
      addFinding(
        findings,
        "blocker",
        "COMPUTE_OVERRUN_APPROVAL_MISSING",
        `Actual usage is ${overrunPercent.toFixed(1)}% over the reserved budget without overrun approval.`,
        "Pause billing and collect explicit overrun approval before recognizing the excess usage.",
      );
      actions.push({ type: "require-overrun-approval", reservationId: reservation.id, overrunPercent: Number(overrunPercent.toFixed(2)) });
    }
  }

  if (normalize(reservation.dataSensitivity) === "restricted" && !evidenceIds.includes("dpa") && !evidenceIds.includes("data-use-agreement")) {
    addFinding(
      findings,
      "blocker",
      "RESTRICTED_DATA_AGREEMENT_MISSING",
      "Restricted data compute is missing DPA or data-use-agreement evidence.",
      "Attach the signed data agreement before releasing GPUs or revenue recognition.",
    );
  }

  if (expiresAt > 0 && expiresAt < now && actualCents === 0) {
    addFinding(
      findings,
      "warning",
      "UNUSED_RESERVATION_EXPIRED",
      "The reservation expired without usage.",
      "Release unused budget and keep an audit note for the funding ledger.",
    );
    actions.push({ type: "release-unused-budget", reservationId: reservation.id, amount: fromCents(requestedCents), currency });
  }

  const unusedCents = Math.max(0, requestedCents - actualCents);
  const unusedRatio = requestedCents > 0 ? unusedCents / requestedCents : 0;
  if (completed && unusedRatio >= Number(reservation.unusedReleaseThreshold ?? 0.35)) {
    actions.push({ type: "release-unused-budget", reservationId: reservation.id, amount: fromCents(unusedCents), currency });
  }

  if (completed && invoiceEvidence.length === 0) {
    addFinding(
      findings,
      "warning",
      "INVOICE_EVIDENCE_MISSING",
      "The completed compute job has no invoice evidence packet.",
      "Attach usage report, order form, and invoice artifacts before revenue is marked billable.",
    );
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const recognizedCents = completed && blockers.length === 0 ? actualCents : 0;
  const deferredCents = Math.max(0, requestedCents - recognizedCents);

  if (deferredCents > 0) {
    actions.push({ type: "defer-revenue", reservationId: reservation.id, amount: fromCents(deferredCents), currency });
  }

  const review = {
    reservationId: reservation.id,
    projectId: reservation.projectId,
    decision: blockers.length > 0 ? "hold-reservation" : warnings.length > 0 ? "approve-with-controls" : "approved",
    requestedAmount: fromCents(requestedCents),
    actualAmount: fromCents(actualCents),
    recognizedRevenue: fromCents(recognizedCents),
    deferredRevenue: fromCents(deferredCents),
    currency,
    findings,
    financeActions: actions,
  };

  return {
    ...review,
    reservationDigest: digest(review),
  };
}

function evaluateComputeBudgetReservations(packet = {}) {
  const context = {
    now: parseDate(packet.now || new Date().toISOString()),
    currency: packet.currency || "USD",
    grants: indexById(packet.grants),
  };
  const reservations = asArray(packet.reservations).map((reservation) => evaluateReservation(reservation, context));
  const counts = reservations.reduce(
    (acc, reservation) => {
      acc[reservation.decision] = (acc[reservation.decision] || 0) + 1;
      acc.findings += reservation.findings.length;
      return acc;
    },
    { approved: 0, "approve-with-controls": 0, "hold-reservation": 0, findings: 0 },
  );
  const financeActions = reservations.flatMap((reservation) => reservation.financeActions);
  const report = {
    accountId: packet.accountId || "unknown-account",
    generatedAt: packet.now || new Date().toISOString(),
    decision: counts["hold-reservation"] > 0 ? "hold-compute-release" : counts["approve-with-controls"] > 0 ? "release-with-controls" : "release-compute",
    counts,
    reservations,
    financeActions,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

module.exports = {
  evaluateComputeBudgetReservations,
  stableStringify,
};
