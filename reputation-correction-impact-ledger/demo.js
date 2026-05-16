"use strict";

const { buildCorrectionLedger } = require("./index");

const ledger = buildCorrectionLedger({
  profileId: "researcher-ada",
  receipts: [
    {
      id: "review-7",
      kind: "peer_review",
      projectId: "neuro-biomarker-atlas",
      domain: "review",
      points: 28
    },
    {
      id: "credit-3",
      kind: "contribution_credit",
      projectId: "neuro-biomarker-atlas",
      domain: "credit",
      points: 18
    },
    {
      id: "badge-2",
      kind: "reproducibility_badge",
      projectId: "climate-model-rerun",
      domain: "reproducibility",
      points: 26
    }
  ],
  corrections: [
    {
      id: "corr-1",
      targetReceiptId: "review-7",
      action: "retract",
      reason: "reviewer conflict disclosed after publication",
      decidedAt: "2026-05-10T09:00:00Z"
    },
    {
      id: "corr-2",
      targetReceiptId: "credit-3",
      action: "amend_points",
      correctedPoints: 8,
      reason: "role changed from primary curation to verification support",
      decidedAt: "2026-05-11T12:00:00Z"
    },
    {
      id: "corr-3",
      targetReceiptId: "badge-2",
      action: "appeal_hold",
      reason: "rerun package is under independent review",
      appealUntil: "2026-05-22T23:59:59Z",
      decidedAt: "2026-05-12T12:00:00Z"
    }
  ]
});

console.log(JSON.stringify({
  profileId: ledger.profileId,
  score: `${ledger.originalScore} -> ${ledger.correctedScore}`,
  revokedReceiptIds: ledger.revokedReceiptIds,
  amendedReceiptIds: ledger.amendedReceiptIds,
  appealWindows: ledger.appealWindows,
  leaderboardEligible: ledger.leaderboardEligible,
  correctionPacketDigest: ledger.correctionPacketDigest
}, null, 2));
