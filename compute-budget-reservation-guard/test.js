const assert = require("assert");
const { evaluateComputeBudgetReservations } = require("./index");

function basePacket(overrides = {}) {
  return {
    accountId: "inst-ai-lab",
    now: "2026-06-01T12:00:00Z",
    grants: [
      {
        id: "grant-ai-open",
        remainingBudget: 12000,
        restrictions: [],
        allowedOverrunPercent: 5,
      },
    ],
    reservations: [
      {
        id: "res-gpu-101",
        projectId: "project-protein-folding",
        grantId: "grant-ai-open",
        requestedUnits: 100,
        unitPrice: 40,
        actualUnits: 92,
        currency: "USD",
        expiresAt: "2026-06-10T00:00:00Z",
        dataSensitivity: "standard",
        job: { status: "completed" },
        approvals: [
          { role: "pi", approvedAt: "2026-05-30T09:00:00Z" },
          { role: "finance", approvedAt: "2026-05-30T10:00:00Z" },
        ],
        invoice: { evidenceIds: ["usage-report", "order-form"] },
      },
    ],
    ...overrides,
  };
}

function testApprovedReservationRecognizesCompletedUsage() {
  const result = evaluateComputeBudgetReservations(basePacket());

  assert.equal(result.decision, "release-compute");
  assert.equal(result.counts.approved, 1);
  assert.equal(result.reservations[0].recognizedRevenue, 3680);
  assert.equal(result.reservations[0].deferredRevenue, 320);
}

function testOverrunWithoutApprovalHoldsReservation() {
  const result = evaluateComputeBudgetReservations(
    basePacket({
      reservations: [
        {
          ...basePacket().reservations[0],
          requestedUnits: 100,
          actualUnits: 118,
          approvals: [{ role: "pi", approvedAt: "2026-05-30T09:00:00Z" }],
        },
      ],
    }),
  );

  assert.equal(result.decision, "hold-compute-release");
  assert.ok(result.reservations[0].findings.some((finding) => finding.code === "COMPUTE_OVERRUN_APPROVAL_MISSING"));
  assert.ok(result.financeActions.some((action) => action.type === "require-overrun-approval"));
}

function testGrantRestrictionBlocksCommercialAiWorkload() {
  const result = evaluateComputeBudgetReservations(
    basePacket({
      grants: [{ id: "grant-basic-research", remainingBudget: 9000, restrictions: ["no-commercial-ai"] }],
      reservations: [
        {
          ...basePacket().reservations[0],
          grantId: "grant-basic-research",
          workloadType: "commercial-ai-validation",
        },
      ],
    }),
  );

  assert.equal(result.reservations[0].decision, "hold-reservation");
  assert.ok(result.reservations[0].findings.some((finding) => finding.code === "GRANT_RESTRICTION_BLOCKS_WORKLOAD"));
}

function testExpiredUnusedReservationReleasesBudget() {
  const result = evaluateComputeBudgetReservations(
    basePacket({
      reservations: [
        {
          ...basePacket().reservations[0],
          actualUnits: 0,
          expiresAt: "2026-05-25T00:00:00Z",
          job: { status: "not-started" },
        },
      ],
    }),
  );

  assert.equal(result.decision, "release-with-controls");
  assert.ok(result.financeActions.some((action) => action.type === "release-unused-budget" && action.amount === 4000));
}

function testRestrictedDataRequiresAgreementEvidence() {
  const result = evaluateComputeBudgetReservations(
    basePacket({
      reservations: [
        {
          ...basePacket().reservations[0],
          dataSensitivity: "restricted",
          evidenceIds: ["irb-approval"],
        },
      ],
    }),
  );

  assert.equal(result.decision, "hold-compute-release");
  assert.ok(result.reservations[0].findings.some((finding) => finding.code === "RESTRICTED_DATA_AGREEMENT_MISSING"));
}

function testDeterministicDigest() {
  const first = evaluateComputeBudgetReservations(basePacket());
  const second = evaluateComputeBudgetReservations(basePacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

testApprovedReservationRecognizesCompletedUsage();
testOverrunWithoutApprovalHoldsReservation();
testGrantRestrictionBlocksCommercialAiWorkload();
testExpiredUnusedReservationReleasesBudget();
testRestrictedDataRequiresAgreementEvidence();
testDeterministicDigest();

console.log("compute-budget-reservation-guard tests passed");
