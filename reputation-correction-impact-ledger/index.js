"use strict";

const crypto = require("crypto");

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((accumulator, key) => {
      accumulator[key] = stableJson(value[key]);
      return accumulator;
    }, {});
  }
  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableJson(value)))
    .digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function receiptPoints(receipt) {
  if (typeof receipt.points === "number") return receipt.points;
  const defaults = {
    peer_review: 18,
    contribution_credit: 12,
    reproducibility_badge: 24,
    endorsement: 8,
    bounty_completion: 30
  };
  return defaults[receipt.kind] || 0;
}

function buildCorrectionIndex(corrections) {
  const index = new Map();
  for (const correction of asArray(corrections).slice().sort((a, b) =>
    String(a.decidedAt || "").localeCompare(String(b.decidedAt || ""))
  )) {
    const list = index.get(correction.targetReceiptId) || [];
    list.push(correction);
    index.set(correction.targetReceiptId, list);
  }
  return index;
}

function applyReceiptCorrections(receipt, corrections) {
  let correctedPoints = receiptPoints(receipt);
  let status = "active";
  const appliedCorrections = [];
  const appealWindows = [];

  for (const correction of asArray(corrections)) {
    appliedCorrections.push({
      id: correction.id,
      action: correction.action,
      reason: correction.reason || "not provided",
      decidedAt: correction.decidedAt || null
    });

    if (correction.action === "retract") {
      correctedPoints = 0;
      status = "retracted";
    }

    if (correction.action === "amend_points") {
      correctedPoints = correction.correctedPoints;
      status = "amended";
    }

    if (correction.action === "appeal_hold") {
      status = status === "active" ? "under_appeal" : status;
      appealWindows.push({
        correctionId: correction.id,
        appealUntil: correction.appealUntil,
        reason: correction.reason || "appeal pending"
      });
    }

    if (correction.action === "restore") {
      correctedPoints = correction.restoredPoints ?? receiptPoints(receipt);
      status = "restored";
    }
  }

  return {
    receiptId: receipt.id,
    kind: receipt.kind,
    projectId: receipt.projectId || null,
    domain: receipt.domain || "general",
    originalPoints: receiptPoints(receipt),
    correctedPoints,
    status,
    appliedCorrections,
    appealWindows,
    originalDigest: digest(receipt),
    correctedDigest: digest({
      receiptId: receipt.id,
      correctedPoints,
      status,
      appliedCorrections
    })
  };
}

function summarizeDomainScores(adjustedReceipts) {
  const scores = {};
  for (const receipt of adjustedReceipts) {
    scores[receipt.domain] = (scores[receipt.domain] || 0) + receipt.correctedPoints;
  }
  return Object.keys(scores).sort().map((domain) => ({
    domain,
    score: scores[domain]
  }));
}

function buildCorrectionLedger({ profileId, receipts, corrections }) {
  if (!profileId) {
    throw new Error("profileId is required");
  }

  const correctionIndex = buildCorrectionIndex(corrections);
  const adjustedReceipts = asArray(receipts).map((receipt) =>
    applyReceiptCorrections(receipt, correctionIndex.get(receipt.id))
  );

  const originalScore = adjustedReceipts.reduce((sum, receipt) => sum + receipt.originalPoints, 0);
  const correctedScore = adjustedReceipts.reduce((sum, receipt) => sum + receipt.correctedPoints, 0);
  const revokedReceiptIds = adjustedReceipts
    .filter((receipt) => receipt.status === "retracted")
    .map((receipt) => receipt.receiptId)
    .sort();
  const amendedReceiptIds = adjustedReceipts
    .filter((receipt) => receipt.status === "amended")
    .map((receipt) => receipt.receiptId)
    .sort();
  const appealWindows = adjustedReceipts.flatMap((receipt) =>
    receipt.appealWindows.map((window) => ({
      receiptId: receipt.receiptId,
      ...window
    }))
  );

  return {
    profileId,
    originalScore,
    correctedScore,
    scoreDelta: correctedScore - originalScore,
    revokedReceiptIds,
    amendedReceiptIds,
    appealWindows,
    leaderboardEligible: appealWindows.length === 0 && revokedReceiptIds.length === 0,
    domainScores: summarizeDomainScores(adjustedReceipts),
    adjustedReceipts,
    correctionPacketDigest: digest({
      profileId,
      adjustedReceipts,
      correctedScore,
      appealWindows
    })
  };
}

module.exports = {
  applyReceiptCorrections,
  buildCorrectionLedger,
  digest
};
