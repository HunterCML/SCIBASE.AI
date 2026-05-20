"use strict";

const assert = require("node:assert/strict");
const {
  evaluateMethodReadiness,
  inferDomain,
  makeCitation,
  splitSentences,
  stableDigest,
  summarizePaper,
} = require("./index");

const completeClinicalDraft = {
  title: "Remote blood pressure monitoring in a randomized cohort",
  abstract:
    "We tested remote blood pressure monitoring in a randomized clinical cohort. The intervention improved weekly adherence.",
  methods:
    "The IRB approved protocol enrolled n=184 patients with informed consent. Participants were randomized by block allocation and assessors were blinded. Statistical analysis used mixed effects models with 95% confidence interval reporting. Data are available in Zenodo under accession BP-2026.",
  results:
    "Adherence improved by 14 percentage points with p < 0.01 and 95% confidence interval 8 to 20 points. Limitations include a single-region recruitment pool.",
  keyFinding: "Remote monitoring improved adherence without increasing visit burden.",
};

const completeResult = evaluateMethodReadiness(completeClinicalDraft, {
  citationStyle: "nature",
});
assert.equal(inferDomain(`${completeClinicalDraft.abstract} ${completeClinicalDraft.methods}`), "clinical");
assert.equal(completeResult.domain, "clinical");
assert.equal(completeResult.readyForPreReview, true);
assert.ok(completeResult.readinessScore >= 88);
assert.equal(completeResult.peerReviewDiagnostics.redlines.length, 0);
assert.ok(
  completeResult.citationRecommendations.some((citation) =>
    citation.formattedReference.includes("CONSORT reporting"),
  ),
);
assert.match(completeResult.auditDigest, /^[a-f0-9]{64}$/);

const riskyComputationalDraft = {
  title: "Transformer model for assay anomaly detection",
  abstract: "We trained a model to identify assay anomalies from internal examples.",
  methods:
    "The model was trained on a private dataset. Accuracy was compared with a baseline and p=0.03. We do not describe the execution runtime.",
  results: "The model was more accurate than the baseline.",
};

const riskyResult = evaluateMethodReadiness(riskyComputationalDraft);
assert.equal(riskyResult.domain, "computational");
assert.equal(riskyResult.readyForPreReview, false);
assert.ok(riskyResult.readinessScore < 70);
assert.ok(riskyResult.peerReviewDiagnostics.redlines.some((redline) => redline.code === "missing-code-availability"));
assert.ok(riskyResult.peerReviewDiagnostics.redlines.some((redline) => redline.code === "missing-environment"));
assert.ok(riskyResult.peerReviewDiagnostics.redlines.some((redline) => redline.code === "p-value-without-interval"));
assert.ok(riskyResult.insertionTasks.every((task) => ["methods", "discussion"].includes(task.target)));
assert.ok(riskyResult.citationRecommendations.some((citation) => citation.topic === "software citation"));

const laySummary = summarizePaper(completeClinicalDraft, "layperson");
assert.equal(laySummary.mode, "layperson");
assert.ok(laySummary.summary.includes("studies whether"));
assert.ok(laySummary.evidenceSpans.length >= 2);

assert.equal(splitSentences("One. Two? Three!").length, 3);
assert.ok(makeCitation("FAIR data availability", "mla").includes("FAIR data availability"));
assert.equal(stableDigest({ b: 2, a: 1 }), stableDigest({ a: 1, b: 2 }));

console.log("methods reproducibility redline tests passed");
