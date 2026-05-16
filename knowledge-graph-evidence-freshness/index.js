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

function ageInDays(publishedAt, asOf) {
  const start = Date.parse(publishedAt);
  const end = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function evaluateEvidence(evidence, options = {}) {
  const asOf = options.asOf || new Date().toISOString();
  const maxAgeDays = options.maxAgeDays || 730;
  const status = evidence.status || "active";
  const ageDays = ageInDays(evidence.publishedAt, asOf);
  const reasons = [];
  let riskScore = 0;

  if (status === "retracted") {
    reasons.push("retracted_evidence");
    riskScore += 100;
  }

  if (status === "corrected") {
    reasons.push("corrected_evidence");
    riskScore += 45;
  }

  if (status === "superseded") {
    reasons.push("superseded_evidence");
    riskScore += 35;
  }

  if (ageDays > maxAgeDays) {
    reasons.push("stale_by_age");
    riskScore += Math.min(35, Math.floor((ageDays - maxAgeDays) / 30) + 10);
  }

  if (evidence.replicationStatus === "failed") {
    reasons.push("failed_replication");
    riskScore += 50;
  }

  const replacementEvidenceIds = asArray(evidence.replacementEvidenceIds).slice().sort();

  return {
    evidenceId: evidence.id,
    title: evidence.title,
    status,
    ageDays,
    riskScore,
    reasons,
    replacementEvidenceIds,
    digest: digest({
      id: evidence.id,
      status,
      ageDays,
      reasons,
      replacementEvidenceIds
    })
  };
}

function evaluateEdge(edge, evidenceIndex, options = {}) {
  const evidenceReviews = asArray(edge.evidenceIds).map((id) => {
    const evidence = evidenceIndex.get(id);
    if (!evidence) {
      return {
        evidenceId: id,
        status: "missing",
        ageDays: 0,
        riskScore: 70,
        reasons: ["missing_evidence"],
        replacementEvidenceIds: [],
        digest: digest({ missing: id })
      };
    }
    return evaluateEvidence(evidence, options);
  });

  const totalRisk = evidenceReviews.reduce((sum, item) => sum + item.riskScore, 0);
  const replacementEvidenceIds = Array.from(new Set(
    evidenceReviews.flatMap((item) => item.replacementEvidenceIds)
  )).sort();

  const hasRetraction = evidenceReviews.some((item) => item.reasons.includes("retracted_evidence"));
  const hasFailedReplication = evidenceReviews.some((item) => item.reasons.includes("failed_replication"));
  const hasCorrection = evidenceReviews.some((item) =>
    item.reasons.includes("corrected_evidence") || item.reasons.includes("superseded_evidence")
  );
  const hasStaleEvidence = evidenceReviews.some((item) =>
    item.reasons.includes("stale_by_age")
  );

  const decision = hasRetraction || hasFailedReplication
    ? "suppress_recommendation"
    : hasCorrection || hasStaleEvidence || totalRisk >= 45
      ? "review_before_recommending"
      : totalRisk > 0
        ? "recommend_with_freshness_note"
        : "recommend";

  return {
    edgeId: edge.id,
    source: edge.source,
    target: edge.target,
    relation: edge.relation,
    decision,
    totalRisk,
    evidenceReviews,
    replacementEvidenceIds,
    recommendationAllowed: decision === "recommend" || decision === "recommend_with_freshness_note",
    reviewDigest: digest({
      edge,
      decision,
      totalRisk,
      evidenceReviews,
      replacementEvidenceIds
    })
  };
}

function buildFreshnessReview({ evidence, edges, asOf, maxAgeDays }) {
  const evidenceIndex = new Map(asArray(evidence).map((item) => [item.id, item]));
  const edgeReviews = asArray(edges).map((edge) =>
    evaluateEdge(edge, evidenceIndex, { asOf, maxAgeDays })
  );

  const suppressedEdges = edgeReviews
    .filter((edge) => edge.decision === "suppress_recommendation")
    .map((edge) => edge.edgeId)
    .sort();
  const reviewRequiredEdges = edgeReviews
    .filter((edge) => edge.decision === "review_before_recommending")
    .map((edge) => edge.edgeId)
    .sort();
  const recommendationEdges = edgeReviews
    .filter((edge) => edge.recommendationAllowed)
    .map((edge) => edge.edgeId)
    .sort();
  const replacementCandidates = Array.from(new Set(
    edgeReviews.flatMap((edge) => edge.replacementEvidenceIds)
  )).sort();

  return {
    generatedAt: asOf,
    suppressedEdges,
    reviewRequiredEdges,
    recommendationEdges,
    replacementCandidates,
    edgeReviews,
    reviewPacketDigest: digest({
      asOf,
      maxAgeDays,
      edgeReviews
    })
  };
}

module.exports = {
  buildFreshnessReview,
  digest,
  evaluateEdge,
  evaluateEvidence
};
