const fs = require("fs");
const path = require("path");
const { evaluateComputeBudgetReservations } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const packet = {
  accountId: "northbridge-research-cloud",
  now: "2026-06-01T12:00:00Z",
  grants: [
    {
      id: "grant-open-compute",
      remainingBudget: 15000,
      restrictions: [],
      allowedOverrunPercent: 5,
    },
    {
      id: "grant-public-health",
      remainingBudget: 6000,
      restrictions: ["no-commercial-ai"],
      allowedOverrunPercent: 0,
    },
  ],
  reservations: [
    {
      id: "res-folding-forecast",
      projectId: "project-protein-folding",
      grantId: "grant-open-compute",
      requestedUnits: 100,
      unitPrice: 45,
      actualUnits: 88,
      expiresAt: "2026-06-12T00:00:00Z",
      job: { status: "completed" },
      dataSensitivity: "standard",
      approvals: [
        { role: "pi", approvedAt: "2026-05-28T09:15:00Z" },
        { role: "finance", approvedAt: "2026-05-28T11:30:00Z" },
      ],
      invoice: { evidenceIds: ["usage-report", "order-form", "invoice-draft"] },
    },
    {
      id: "res-commercial-eval",
      projectId: "project-partner-evaluation",
      grantId: "grant-public-health",
      requestedUnits: 90,
      unitPrice: 50,
      actualUnits: 111,
      expiresAt: "2026-06-08T00:00:00Z",
      workloadType: "commercial-ai-validation",
      dataSensitivity: "restricted",
      evidenceIds: ["irb-approval"],
      job: { status: "completed" },
      approvals: [{ role: "pi", approvedAt: "2026-05-29T15:00:00Z" }],
      invoice: { evidenceIds: [] },
    },
    {
      id: "res-unused-batch",
      projectId: "project-materials-scan",
      grantId: "grant-open-compute",
      requestedBudget: 2800,
      actualCost: 0,
      expiresAt: "2026-05-20T00:00:00Z",
      job: { status: "not-started" },
      approvals: [
        { role: "pi", approvedAt: "2026-05-01T09:00:00Z" },
        { role: "finance", approvedAt: "2026-05-01T09:30:00Z" },
      ],
    },
  ],
};

const report = evaluateComputeBudgetReservations(packet);
const jsonPath = path.join(outputDir, "compute-budget-reservation-report.json");
const markdownPath = path.join(outputDir, "compute-budget-reservation-report.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Compute Budget Reservation Guard Demo",
    "",
    `Decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Reservation Decisions",
    "",
    ...report.reservations.map(
      (reservation) =>
        `- ${reservation.reservationId}: ${reservation.decision}; recognized USD ${reservation.recognizedRevenue.toFixed(2)}; deferred USD ${reservation.deferredRevenue.toFixed(2)}`,
    ),
    "",
    "## Finance Actions",
    "",
    ...report.financeActions.map((action) => `- ${action.type}: ${action.reservationId}`),
    "",
    "## Findings",
    "",
    ...report.reservations.flatMap((reservation) =>
      reservation.findings.map((finding) => `- ${reservation.reservationId}: ${finding.severity} ${finding.code} - ${finding.message}`),
    ),
    "",
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`${report.decision}: ${report.counts.findings} finding(s), ${report.auditDigest}`);
