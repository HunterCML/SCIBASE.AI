"use strict";

const { buildFreshnessReview } = require("./index");

const review = buildFreshnessReview({
  asOf: "2026-05-16T00:00:00Z",
  maxAgeDays: 730,
  evidence: [
    {
      id: "paper-crispr-qc-v1",
      title: "CRISPR QC protocol first release",
      status: "retracted",
      publishedAt: "2024-02-10T00:00:00Z",
      replacementEvidenceIds: ["paper-crispr-qc-v3"]
    },
    {
      id: "dataset-single-cell-22",
      title: "Single-cell atlas v22",
      status: "corrected",
      publishedAt: "2025-06-01T00:00:00Z",
      replacementEvidenceIds: ["dataset-single-cell-23"]
    },
    {
      id: "replication-failure-9",
      title: "External failed replication of marker panel",
      status: "active",
      replicationStatus: "failed",
      publishedAt: "2026-01-11T00:00:00Z"
    }
  ],
  edges: [
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
      id: "edge-marker-panel",
      source: "biomarker panel",
      target: "clinical classifier",
      relation: "supports_claim",
      evidenceIds: ["replication-failure-9"]
    }
  ]
});

console.log(JSON.stringify({
  suppressedEdges: review.suppressedEdges,
  reviewRequiredEdges: review.reviewRequiredEdges,
  replacementCandidates: review.replacementCandidates,
  reviewPacketDigest: review.reviewPacketDigest
}, null, 2));
