"use strict";

const assert = require("assert");
const {
  buildFreshnessReview,
  digest,
  evaluateEvidence
} = require("./index");

const evidence = [
  {
    id: "paper-crispr-qc-v1",
    title: "CRISPR QC protocol first release",
    status: "retracted",
    publishedAt: "2024-02-10T00:00:00Z",
    replacementEvidenceIds: ["paper-crispr-qc-v3"]
  },
  {
    id: "paper-crispr-qc-v3",
    title: "CRISPR QC protocol corrected release",
    status: "active",
    publishedAt: "2026-03-04T00:00:00Z"
  },
  {
    id: "dataset-single-cell-22",
    title: "Single-cell atlas v22",
    status: "corrected",
    publishedAt: "2025-06-01T00:00:00Z",
    replacementEvidenceIds: ["dataset-single-cell-23"]
  },
  {
    id: "dataset-single-cell-23",
    title: "Single-cell atlas v23",
    status: "active",
    publishedAt: "2026-04-14T00:00:00Z"
  },
  {
    id: "protocol-culture-old",
    title: "Organoid culture protocol 2019",
    status: "active",
    publishedAt: "2019-03-01T00:00:00Z"
  },
  {
    id: "replication-failure-9",
    title: "External failed replication of marker panel",
    status: "active",
    replicationStatus: "failed",
    publishedAt: "2026-01-11T00:00:00Z"
  }
];

const edges = [
  {
    id: "edge-crispr-method",
    source: "CRISPR editing",
    target: "QC protocol",
    relation: "uses_method",
    evidenceIds: ["paper-crispr-qc-v1"]
  },
  {
    id: "edge-atlas-dataset",
    source: "immune relapse",
    target: "single-cell atlas",
    relation: "uses_dataset",
    evidenceIds: ["dataset-single-cell-22"]
  },
  {
    id: "edge-organoid-culture",
    source: "neuroinflammation assay",
    target: "organoid culture",
    relation: "uses_protocol",
    evidenceIds: ["protocol-culture-old"]
  },
  {
    id: "edge-marker-panel",
    source: "biomarker panel",
    target: "clinical classifier",
    relation: "supports_claim",
    evidenceIds: ["replication-failure-9"]
  }
];

const retraction = evaluateEvidence(evidence[0], {
  asOf: "2026-05-16T00:00:00Z",
  maxAgeDays: 730
});
assert.strictEqual(retraction.status, "retracted");
assert.ok(retraction.riskScore >= 100);
assert.deepStrictEqual(retraction.replacementEvidenceIds, ["paper-crispr-qc-v3"]);

const review = buildFreshnessReview({
  evidence,
  edges,
  asOf: "2026-05-16T00:00:00Z",
  maxAgeDays: 730
});

assert.deepStrictEqual(review.suppressedEdges, ["edge-crispr-method", "edge-marker-panel"]);
assert.deepStrictEqual(review.reviewRequiredEdges, ["edge-atlas-dataset", "edge-organoid-culture"]);
assert.deepStrictEqual(review.recommendationEdges, []);
assert.deepStrictEqual(review.replacementCandidates, ["dataset-single-cell-23", "paper-crispr-qc-v3"]);

const correctedEdge = review.edgeReviews.find((edge) => edge.edgeId === "edge-atlas-dataset");
assert.strictEqual(correctedEdge.decision, "review_before_recommending");
assert.strictEqual(correctedEdge.recommendationAllowed, false);

const staleEdge = review.edgeReviews.find((edge) => edge.edgeId === "edge-organoid-culture");
assert.ok(staleEdge.evidenceReviews[0].reasons.includes("stale_by_age"));
assert.strictEqual(digest(review).length, 64);

console.log("knowledge-graph-evidence-freshness tests passed");
