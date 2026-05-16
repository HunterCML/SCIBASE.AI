"use strict";

const assert = require("assert");
const {
  applyReceiptCorrections,
  buildCorrectionLedger,
  digest
} = require("./index");

const receipts = [
  {
    id: "review-7",
    kind: "peer_review",
    projectId: "neuro-biomarker-atlas",
    domain: "review",
    points: 28,
    createdAt: "2026-05-01T10:00:00Z",
    evidence: "structured review with reproducibility notes"
  },
  {
    id: "credit-3",
    kind: "contribution_credit",
    projectId: "neuro-biomarker-atlas",
    domain: "credit",
    points: 18,
    role: "data curation"
  },
  {
    id: "badge-2",
    kind: "reproducibility_badge",
    projectId: "climate-model-rerun",
    domain: "reproducibility",
    points: 26
  },
  {
    id: "endorsement-5",
    kind: "endorsement",
    projectId: "climate-model-rerun",
    domain: "community",
    points: 10
  }
];

const corrections = [
  {
    id: "corr-1",
    targetReceiptId: "review-7",
    action: "retract",
    reason: "reviewer conflict disclosed after publication",
    decidedAt: "2026-05-10T09:00:00Z",
    appealUntil: "2026-05-20T23:59:59Z"
  },
  {
    id: "corr-2",
    targetReceiptId: "credit-3",
    action: "amend_points",
    reason: "role changed from primary curation to verification support",
    correctedPoints: 8,
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
];

const retracted = applyReceiptCorrections(receipts[0], [corrections[0]]);
assert.strictEqual(retracted.status, "retracted");
assert.strictEqual(retracted.correctedPoints, 0);
assert.strictEqual(retracted.originalDigest.length, 64);

const amended = applyReceiptCorrections(receipts[1], [corrections[1]]);
assert.strictEqual(amended.status, "amended");
assert.strictEqual(amended.correctedPoints, 8);
assert.ok(amended.appliedCorrections[0].reason.includes("verification"));

const ledger = buildCorrectionLedger({
  profileId: "researcher-ada",
  receipts,
  corrections
});

assert.strictEqual(ledger.originalScore, 82);
assert.strictEqual(ledger.correctedScore, 44);
assert.strictEqual(ledger.scoreDelta, -38);
assert.deepStrictEqual(ledger.revokedReceiptIds, ["review-7"]);
assert.deepStrictEqual(ledger.amendedReceiptIds, ["credit-3"]);
assert.strictEqual(ledger.leaderboardEligible, false);
assert.strictEqual(ledger.appealWindows.length, 1);
assert.ok(ledger.domainScores.find((domain) => domain.domain === "review").score === 0);
assert.strictEqual(digest(ledger).length, 64);

console.log("reputation-correction-impact-ledger tests passed");
