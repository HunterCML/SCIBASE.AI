"use strict";

const assert = require("assert");
const {
  buildAssistantPacket,
  extractSignals,
  rankOpportunities
} = require("./index");

const papers = [
  {
    id: "P1",
    title: "Single-cell biomarker panel for immune relapse",
    year: 2025,
    topics: ["cancer-immunology", "biomarkers"],
    methods: ["single-cell-rna", "cohort-validation"],
    limitations: ["small donor diversity limited generalization"],
    negativeResults: ["marker panel failed in low-input samples"],
    failedReplications: []
  },
  {
    id: "P2",
    title: "External validation of relapse classifiers",
    year: 2026,
    topics: ["cancer-immunology", "biomarkers"],
    methods: ["single-cell-rna"],
    limitations: ["public cohort lacked paired tissue samples"],
    negativeResults: [],
    failedReplications: ["classifier did not reproduce on public atlas data"]
  },
  {
    id: "P3",
    title: "Perovskite stress test benchmark",
    year: 2024,
    topics: ["materials"],
    methods: ["xray-diffraction"],
    limitations: ["humidity chamber unavailable"],
    negativeResults: ["annealing protocol decreased stability"],
    failedReplications: []
  }
];

const signals = extractSignals(papers[0]);
assert.strictEqual(signals.length, 2);
assert.ok(signals.every((signal) => signal.evidenceDigest.length > 20));

const opportunities = rankOpportunities({
  papers,
  labCapabilities: ["single-cell-rna", "cohort-validation"],
  userInterests: ["cancer-immunology", "biomarkers"],
  minimumScore: 20
});

assert.ok(opportunities.length >= 2);
assert.strictEqual(opportunities[0].topic, "biomarkers");
assert.strictEqual(opportunities[0].method, "single-cell-rna");
assert.strictEqual(opportunities[0].confidence, "high");
assert.ok(opportunities[0].evidence.some((item) => item.paperId === "P1"));
assert.ok(opportunities[0].evidence.some((item) => item.paperId === "P2"));
assert.ok(opportunities[0].reproducibilityFlags.includes("failed_replication_evidence"));
assert.ok(opportunities[0].recommendedActions.some((action) => action.includes("replication")));

const materials = opportunities.find((item) => item.topic === "materials");
assert.ok(materials);
assert.ok(materials.score < opportunities[0].score);

const packet = buildAssistantPacket({
  projectId: "immune-relapse-roadmap",
  opportunities
});

assert.strictEqual(packet.rankedOpportunityCount, opportunities.length);
assert.ok(packet.topRecommendation.focus.includes("single-cell-rna"));
assert.ok(packet.peerReviewPrompts[0].includes("negative"));
assert.ok(packet.citationQueries[0].includes("failed replication"));
assert.ok(packet.reproducibilityChecklist[0].includes("P1"));

console.log("negative-results-opportunity-radar tests passed");

