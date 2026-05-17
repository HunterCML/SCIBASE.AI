"use strict";

const assert = require("node:assert/strict");
const { classifyArtifact, evaluateArtifactPackage, stableDigest } = require("./index");

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);

const validPackage = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  project: { id: "proj-microbiome-2026", title: "Microbiome replication package" },
  metadata: {
    datacite: {
      identifier: "10.5555/scibase.microbiome.2026",
      creators: ["A. Researcher", "B. Analyst"],
      titles: ["Microbiome replication package"],
      publisher: "SCIBASE.AI",
      publicationYear: "2026",
      resourceType: "Dataset and software",
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Microbiome replication package",
    },
    schemaOrg: {
      "@type": "Dataset",
      name: "Microbiome replication package",
    },
  },
  artifacts: [
    {
      id: "art-raw-counts",
      path: "data/raw-counts.csv",
      bytes: 1024,
      hash: HASH_A,
      license: "CC-BY-4.0",
      access: "public",
      version: 2,
      previousVersionHash: HASH_B,
      metadata: { title: "Raw abundance counts", creators: ["A. Researcher"], keywords: ["microbiome", "counts"] },
    },
    {
      id: "art-notebook",
      path: "notebooks/reproduce.ipynb",
      bytes: 2048,
      hash: HASH_C,
      license: "MIT",
      access: "public",
      metadata: { title: "Reproduction notebook", creators: ["B. Analyst"], keywords: ["notebook"] },
    },
    {
      id: "art-figure",
      path: "figures/alpha-diversity.png",
      bytes: 4096,
      hash: HASH_D,
      license: "CC-BY-4.0",
      access: "restricted",
      accessJustification: "contains unpublished cohort label in thumbnail metadata",
      reviewerAccessWindow: "2026-05-17/2026-06-17",
      metadata: { title: "Alpha diversity preview", creators: ["B. Analyst"], keywords: ["figure"] },
    },
  ],
  environments: [
    {
      id: "env-python",
      name: "Pinned Python reproducer",
      image: "ghcr.io/scibase/reproducer@sha256:" + "e".repeat(64),
      runtimes: ["python"],
      trigger: "run-analysis-button",
      commands: [
        {
          id: "rerun-notebook",
          label: "Rerun notebook",
          command: "python scripts/run_notebook.py notebooks/reproduce.ipynb",
          inputs: ["data/raw-counts.csv", "notebooks/reproduce.ipynb"],
          outputs: ["figures/alpha-diversity.png"],
        },
      ],
    },
  ],
};

const result = evaluateArtifactPackage(validPackage);

assert.equal(classifyArtifact({ path: "data/results.parquet" }).category, "dataset");
assert.equal(classifyArtifact({ path: "analysis/model.onnx" }).previewKind, "model-summary");
assert.equal(result.dashboard.artifacts, 3);
assert.equal(result.dashboard.categories.dataset, 1);
assert.equal(result.dashboard.categories.notebook, 1);
assert.equal(result.dashboard.categories.figure, 1);
assert.equal(result.dashboard.previewableArtifacts, 3);
assert.equal(result.dashboard.runnableCommands, 1);
assert.equal(result.dashboard.blockers, 0);
assert.equal(result.dashboard.highRiskFindings, 0);
assert.equal(result.dashboard.packageReady, true);
assert.match(result.exportPacket.packageDigest, /^[a-f0-9]{64}$/);
assert.equal(result.exportPacket.persistentLinks.length, 3);
assert.ok(result.artifacts.find((artifact) => artifact.id === "art-notebook").classification.executable);

const brokenPackage = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  project: { id: "proj-broken" },
  metadata: {
    datacite: {
      identifier: "10.5555/missing-fields",
    },
    jsonLd: { name: "Missing type" },
    schemaOrg: {},
  },
  artifacts: [
    {
      id: "art-private",
      path: "data/participant-export.csv",
      bytes: 4 * 1024 * 1024 * 1024,
      hash: "not-a-hash",
      access: "restricted",
      version: 3,
      metadata: { title: "Participant export" },
    },
  ],
  environments: [
    {
      id: "env-unpinned",
      name: "Unpinned runner",
      image: "python:3.12",
      runtimes: [],
      commands: [
        {
          id: "rerun",
          label: "Rerun",
          command: "python analysis.py data/missing.csv",
          inputs: ["data/missing.csv"],
        },
      ],
    },
  ],
};

const broken = evaluateArtifactPackage(brokenPackage);
assert.equal(broken.dashboard.packageReady, false);
assert.ok(broken.dashboard.blockers >= 2);
assert.ok(broken.findings.some((finding) => finding.message.includes("missing inputs")));
assert.ok(broken.findings.some((finding) => finding.message.includes("sha256")));
assert.ok(broken.findings.some((finding) => finding.message.includes("DataCite")));
assert.equal(broken.environments[0].commands[0].eligible, false);

const digestA = stableDigest({ b: 2, a: [3, 1] });
const digestB = stableDigest({ a: [3, 1], b: 2 });
assert.equal(digestA, digestB);

console.log("artifact package integrity gate tests passed");
