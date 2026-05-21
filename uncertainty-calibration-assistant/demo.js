const fs = require("fs");
const path = require("path");
const { evaluateUncertaintyCalibration } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const packet = {
  manuscriptId: "ms-cognitive-fatigue-042",
  domain: "clinical neuroscience",
  claims: [
    {
      id: "claim-a",
      text: "The intervention definitively eliminates cognitive fatigue in post-viral patients.",
      strength: "high",
      limitations: [],
      evidence: {
        primaryData: true,
        statisticalTest: "mixed-effects model",
        effectSize: 0.26,
        pValue: 0.04,
        sampleSize: 22,
        citations: ["doi:10.5555/pilot-fatigue"],
        replication: { status: "non-deterministic", runId: "rerun-17" },
      },
    },
    {
      id: "claim-b",
      text: "The wearable sleep signal suggests a reusable early-warning marker.",
      strength: "moderate",
      limitations: ["external cohort not yet enrolled"],
      evidence: {
        primaryData: true,
        statisticalTest: "bootstrap stability",
        effectSize: 0.39,
        confidenceInterval: "95% CI 0.14-0.58",
        sampleSize: 72,
        citations: ["doi:10.5555/sleep-marker", "doi:10.5555/wearable-review"],
        replication: { status: "passed", runId: "rerun-18" },
      },
    },
  ],
};

const report = evaluateUncertaintyCalibration(packet);
const jsonPath = path.join(outputDir, "uncertainty-calibration-report.json");
const markdownPath = path.join(outputDir, "uncertainty-calibration-report.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Uncertainty Calibration Assistant Demo",
    "",
    `Decision: ${report.decision}`,
    `Reproducibility confidence: ${report.reproducibilityConfidence}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Calibrated Claims",
    "",
    ...report.calibratedClaims.map((claim) => `- ${claim.id}: ${claim.calibrated} (${claim.confidence})`),
    "",
    "## Findings",
    "",
    ...report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}`),
    "",
    "## Research Opportunities",
    "",
    ...report.researchOpportunities.map((item) => `- ${item.priority}: ${item.claimId} - ${item.opportunity}`),
    "",
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`${report.decision}: ${report.findings.length} finding(s), ${report.auditDigest}`);
