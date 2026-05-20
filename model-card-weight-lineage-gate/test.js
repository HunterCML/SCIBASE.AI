const assert = require("assert");
const { evaluateModelWeights, digest } = require("./index");

const NOW = "2026-05-20T12:00:00Z";

function completePackage(overrides = {}) {
  const trainingDatasets = [
    {
      id: "single-cell-biomarker-v2",
      doi: "10.5555/scibase.training.22",
      hash: "sha256:training-data-v2",
      license: "CC-BY-4.0",
      consentBasis: "IRB-approved deidentified research reuse",
      access: "public",
    },
  ];

  return {
    modelId: "biomarker-prioritizer",
    version: "1.2.0",
    title: "Biomarker Prioritizer Weights",
    owner: "SCIBASE model registry",
    creators: [{ name: "Example Lab", orcid: "0000-0002-1825-0097" }],
    publicationYear: 2026,
    artifacts: {
      weights: {
        path: "models/biomarker-prioritizer/weights.safetensors",
        sha256: "sha256:model-weight-v120",
        format: "safetensors",
        framework: "pytorch",
        bytes: 82411264,
        license: "Apache-2.0",
      },
    },
    modelCard: {
      intendedUse: "Rank candidate biomarkers for reviewer triage.",
      limitations: "Not a diagnostic device and not approved for clinical treatment decisions.",
      trainingData: "Synthetic single-cell metadata and validated open training packets.",
      evaluation: "AUROC and calibration drift reported on held-out synthetic cohorts.",
      license: "Apache-2.0",
      ethicalConsiderations: "Human review required for disease-specific recommendations.",
    },
    lineage: {
      trainingDatasets,
      codeSnapshot: {
        repository: "https://github.com/SCIBASE-AI/model-training",
        commit: "4ef2c98",
        hash: "sha256:training-code",
      },
      environment: {
        runtime: "python3.11-pytorch2.3-cuda12.1",
        lockfileHash: "sha256:lockfile",
        containerHash: "sha256:container",
        reproduceCommand: "python train.py --config configs/biomarker-v1.2.yml",
      },
      evaluation: {
        updatedForTrainingDataChange: true,
        metrics: [
          { name: "AUROC", value: 0.91, benchmark: "held-out synthetic cohort" },
          { name: "Calibration error", value: 0.04, benchmark: "held-out synthetic cohort" },
        ],
      },
    },
    access: {
      visibility: "public",
      license: "Apache-2.0",
    },
    rerun: {
      command: "python reproduce.py --model biomarker-prioritizer",
      status: "passed",
      outputHash: "sha256:expected-output",
      expectedOutputHash: "sha256:expected-output",
      logHash: "sha256:rerun-log",
    },
    previousSnapshot: {
      version: "1.1.0",
      weightsSha256: "sha256:model-weight-v110",
      trainingDataDigest: digest(
        trainingDatasets.map((dataset) => ({
          id: dataset.id,
          hash: dataset.hash,
          license: dataset.license,
          consentBasis: dataset.consentBasis,
        })),
      ),
    },
    ...overrides,
  };
}

function testReadyPackage() {
  const result = evaluateModelWeights(completePackage(), { now: NOW });

  assert.equal(result.decision, "ready");
  assert.equal(result.counts.blocker, 0);
  assert.ok(result.auditDigest.length === 64);
  assert.equal(result.datacite.resourceType, "Model weights");
  assert.equal(result.schemaOrg.encodingFormat, "safetensors");
}

function testIncompleteModelCardHoldsRelease() {
  const model = completePackage({
    modelCard: {
      intendedUse: "Quick preview only.",
    },
  });

  const result = evaluateModelWeights(model, { now: NOW });
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "MODEL_CARD_INCOMPLETE"));
}

function testRestrictedDataNeedsAgreement() {
  const model = completePackage();
  model.lineage.trainingDatasets[0] = {
    id: "clinical-embargoed-v1",
    hash: "sha256:restricted",
    license: "controlled-use",
    consentBasis: "consented for restricted research",
    access: "restricted",
    embargoUntil: "2026-06-01T00:00:00Z",
  };

  const result = evaluateModelWeights(model, { now: NOW });
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "TRAINING_DATA_EMBARGO_ACTIVE"));
  assert.ok(result.findings.some((finding) => finding.code === "RESTRICTED_DATA_DUA_MISSING"));
}

function testWeightDriftWithoutVersionBumpBlocksRelease() {
  const model = completePackage({
    previousSnapshot: {
      version: "1.2.0",
      weightsSha256: "sha256:older-weights",
    },
  });

  const result = evaluateModelWeights(model, { now: NOW });
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "WEIGHT_HASH_CHANGED_WITHOUT_VERSION_BUMP"));
}

function testRerunMismatchBlocksReproduceButton() {
  const model = completePackage({
    rerun: {
      command: "python reproduce.py --model biomarker-prioritizer",
      status: "passed",
      outputHash: "sha256:drifted-output",
      expectedOutputHash: "sha256:expected-output",
      logHash: "sha256:rerun-log",
    },
  });

  const result = evaluateModelWeights(model, { now: NOW });
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "RERUN_OUTPUT_DRIFT"));
}

function testDeterministicDigest() {
  const model = completePackage();
  const first = evaluateModelWeights(model, { now: NOW });
  const second = evaluateModelWeights(model, { now: NOW });
  assert.equal(first.auditDigest, second.auditDigest);
}

testReadyPackage();
testIncompleteModelCardHoldsRelease();
testRestrictedDataNeedsAgreement();
testWeightDriftWithoutVersionBumpBlocksRelease();
testRerunMismatchBlocksReproduceButton();
testDeterministicDigest();

console.log("model-card-weight-lineage-gate tests passed");
