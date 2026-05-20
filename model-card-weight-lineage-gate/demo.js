const fs = require("fs");
const path = require("path");
const { evaluateModelWeights } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const readyPackage = {
  modelId: "materials-porosity-ranker",
  version: "2.0.0",
  title: "Materials Porosity Ranker Weights",
  owner: "SCIBASE model registry",
  creators: [{ name: "SCIBASE Materials AI Group", orcid: "0000-0003-1415-9265" }],
  publicationYear: 2026,
  artifacts: {
    weights: {
      path: "models/materials-porosity-ranker/weights.safetensors",
      sha256: "sha256:materials-weight-200",
      format: "safetensors",
      framework: "pytorch",
      bytes: 120586240,
      license: "Apache-2.0",
    },
  },
  modelCard: {
    intendedUse: "Rank porous material candidates for follow-up lab validation.",
    limitations: "Synthetic demo data only; predictions require human materials-science review.",
    trainingData: "Open zeolite feature table and synthetic lab benchmark packet.",
    evaluation: "Top-k recovery and calibration drift on held-out synthetic candidates.",
    license: "Apache-2.0",
    ethicalConsiderations: "Do not use for safety-critical materials decisions without lab verification.",
  },
  lineage: {
    trainingDatasets: [
      {
        id: "open-zeolite-features-v3",
        doi: "10.5555/scibase.zeolite.v3",
        hash: "sha256:zeolite-feature-table-v3",
        license: "CC-BY-4.0",
        consentBasis: "open materials data",
        access: "public",
      },
    ],
    codeSnapshot: {
      repository: "https://github.com/SCIBASE-AI/materials-training",
      commit: "84ac320",
      hash: "sha256:materials-training-code",
    },
    environment: {
      runtime: "python3.11-pytorch2.3",
      lockfileHash: "sha256:materials-lock",
      containerHash: "sha256:materials-container",
      reproduceCommand: "python reproduce.py --config materials-v2.yml",
    },
    evaluation: {
      updatedForTrainingDataChange: true,
      metrics: [
        { name: "top10_recall", value: 0.83, benchmark: "held-out synthetic materials" },
        { name: "calibration_error", value: 0.06, benchmark: "held-out synthetic materials" },
      ],
    },
  },
  access: {
    visibility: "public",
    license: "Apache-2.0",
  },
  rerun: {
    command: "python reproduce.py --config materials-v2.yml",
    status: "passed",
    outputHash: "sha256:materials-result",
    expectedOutputHash: "sha256:materials-result",
    logHash: "sha256:materials-rerun-log",
  },
  previousSnapshot: {
    version: "1.9.0",
    weightsSha256: "sha256:materials-weight-190",
  },
};

const heldPackage = {
  ...readyPackage,
  modelId: "clinical-triage-draft",
  version: "0.9.0",
  title: "Clinical Triage Draft Weights",
  artifacts: {
    weights: {
      path: "models/clinical-triage/weights.bin",
      sha256: "sha256:clinical-draft",
      format: "bin",
      framework: "pytorch",
      bytes: 98765432,
      license: "unknown",
    },
  },
  modelCard: {
    intendedUse: "Draft triage classifier for internal review.",
    trainingData: "Restricted synthetic clinical cohort.",
  },
  lineage: {
    ...readyPackage.lineage,
    trainingDatasets: [
      {
        id: "restricted-clinical-cohort",
        hash: "sha256:clinical-cohort",
        license: "controlled-use",
        consentBasis: "IRB-approved restricted use",
        access: "restricted",
        embargoUntil: "2026-06-15T00:00:00Z",
      },
    ],
  },
  access: {
    visibility: "public",
    license: "unknown",
    embargoUntil: "2026-06-15T00:00:00Z",
  },
  rerun: {
    command: "python reproduce.py --config clinical.yml",
    status: "passed",
    outputHash: "sha256:clinical-drifted",
    expectedOutputHash: "sha256:clinical-expected",
    logHash: "sha256:clinical-rerun-log",
  },
};

const evaluated = [
  { name: "ready materials model", report: evaluateModelWeights(readyPackage, { now: "2026-05-20T12:00:00Z" }) },
  { name: "held clinical model", report: evaluateModelWeights(heldPackage, { now: "2026-05-20T12:00:00Z" }) },
];

const jsonPath = path.join(outputDir, "model-weight-lineage-demo.json");
const markdownPath = path.join(outputDir, "model-weight-lineage-demo.md");

fs.writeFileSync(jsonPath, JSON.stringify(evaluated, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Model Card Weight Lineage Gate Demo",
    "",
    ...evaluated.flatMap(({ name, report }) => [
      `## ${name}`,
      "",
      `Decision: ${report.decision}`,
      `Audit digest: ${report.auditDigest}`,
      `Findings: ${report.findings.length}`,
      "",
      ...report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}`),
      "",
    ]),
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(evaluated.map(({ name, report }) => `${name}: ${report.decision}`).join("\n"));
