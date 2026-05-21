const assert = require("assert");
const { evaluateUncertaintyCalibration, evidenceScore } = require("./index");

function readyPacket(overrides = {}) {
  return {
    manuscriptId: "ms-neuro-uncertainty-001",
    domain: "clinical neuroscience",
    claims: [
      {
        id: "claim-1",
        text: "The intervention reduces symptom burden in the pilot cohort.",
        strength: "moderate",
        limitations: ["single-site pilot cohort"],
        evidence: {
          primaryData: true,
          statisticalTest: "mixed-effects model",
          effectSize: 0.42,
          confidenceInterval: "95% CI 0.18-0.63",
          pValue: 0.01,
          sampleSize: 84,
          citations: ["doi:10.1000/a", "doi:10.1000/b"],
          replication: { status: "passed", runId: "rr-001" },
        },
      },
      {
        id: "claim-2",
        text: "The pipeline suggests a reusable biomarker panel.",
        strength: "moderate",
        limitations: ["external cohort pending"],
        evidence: {
          primaryData: true,
          statisticalTest: "bootstrap stability",
          effectSize: 0.31,
          confidenceInterval: "95% CI 0.12-0.49",
          sampleSize: 54,
          citations: ["doi:10.1000/c"],
          replication: { status: "passed", runId: "rr-002" },
        },
      },
    ],
    ...overrides,
  };
}

function testReadyPacket() {
  const result = evaluateUncertaintyCalibration(readyPacket());
  assert.equal(result.decision, "ready-for-review");
  assert.equal(result.counts.blocker, 0);
  assert.equal(result.reproducibilityConfidence, "high");
}

function testAbsoluteLanguageIsBlocked() {
  const result = evaluateUncertaintyCalibration(
    readyPacket({
      claims: [
        {
          id: "claim-risk",
          text: "This model definitively proves the intervention eliminates relapse.",
          strength: "high",
          limitations: [],
          evidence: {
            primaryData: true,
            pValue: 0.04,
            sampleSize: 18,
            citations: ["doi:10.1000/a"],
          },
        },
      ],
    }),
  );

  assert.equal(result.decision, "revise-before-submission");
  assert.ok(result.findings.some((finding) => finding.code === "ABSOLUTE_LANGUAGE_UNDER_SUPPORTED"));
  assert.ok(result.calibratedClaims[0].calibrated.includes("preliminarily"));
}

function testFailedReplicationCreatesResearchOpportunity() {
  const result = evaluateUncertaintyCalibration(
    readyPacket({
      claims: [
        {
          id: "claim-repro",
          text: "The benchmark proves the method always outperforms baseline.",
          strength: "definitive",
          limitations: [],
          evidence: {
            primaryData: true,
            statisticalTest: "paired t-test",
            effectSize: 0.21,
            confidenceInterval: "95% CI -0.02-0.44",
            sampleSize: 44,
            citations: ["doi:10.1000/a"],
            replication: { status: "failed", runId: "rr-failed" },
          },
        },
      ],
    }),
  );

  assert.equal(result.reproducibilityConfidence, "low");
  assert.ok(result.findings.some((finding) => finding.code === "FAILED_REPLICATION_OVERCLAIM"));
  assert.equal(result.researchOpportunities[0].priority, "high");
}

function testDeterministicDigest() {
  const first = evaluateUncertaintyCalibration(readyPacket());
  const second = evaluateUncertaintyCalibration(readyPacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

function testEvidenceScoreRewardsReplication() {
  assert.ok(
    evidenceScore({
      primaryData: true,
      confidenceInterval: "95% CI 0.1-0.3",
      sampleSize: 50,
      replication: { status: "passed" },
    }) > evidenceScore({ primaryData: true, sampleSize: 10, replication: { status: "failed" } }),
  );
}

testReadyPacket();
testAbsoluteLanguageIsBlocked();
testFailedReplicationCreatesResearchOpportunity();
testDeterministicDigest();
testEvidenceScoreRewardsReplication();

console.log("uncertainty-calibration-assistant tests passed");
