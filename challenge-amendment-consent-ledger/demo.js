"use strict";

const { buildAmendmentLedger } = require("./index");

const ledger = buildAmendmentLedger({
  challenge: {
    id: "climate-forecasting-prize",
    title: "Regional climate forecast benchmark",
    finalDeadline: "2026-07-31T23:59:59Z",
    payoutSchedule: "milestone_40_final_60",
    ipTerms: "solver_retains_until_paid",
    privateDataRequired: false
  },
  amendments: [
    {
      id: "amend-rubric-v2",
      sponsorId: "climate-nonprofit",
      requestedAt: "2026-07-14T12:00:00Z",
      reason: "added wildfire smoke impact validation",
      changes: {
        deliverablesAdded: ["wildfire-smoke-validation-notebook"],
        evaluationCriteriaAdded: ["smoke-event regional accuracy"],
        rubricWeightDelta: 18,
        deadlineMovedTo: "2026-07-24T23:59:59Z"
      }
    }
  ],
  teams: [
    { teamId: "open-climate-lab", consentedAmendmentIds: ["amend-rubric-v2"] },
    { teamId: "student-forecast-team", consentedAmendmentIds: [] }
  ],
  submissions: [
    {
      id: "forecast-v1",
      teamId: "student-forecast-team",
      submittedAt: "2026-07-10T09:30:00Z",
      artifactHashes: ["model:9d2a", "report:af18", "notebook:813c"]
    }
  ]
});

console.log(JSON.stringify({
  activeMaterialAmendments: ledger.arbitrationPacket.activeMaterialAmendmentIds,
  safeToContinueTeamIds: ledger.arbitrationPacket.safeToContinueTeamIds,
  protectedWithdrawalTeamIds: ledger.arbitrationPacket.protectedWithdrawalTeamIds,
  blockedAwardTeamIds: ledger.arbitrationPacket.blockedAwardTeamIds,
  packetDigest: ledger.arbitrationPacket.packetDigest
}, null, 2));
