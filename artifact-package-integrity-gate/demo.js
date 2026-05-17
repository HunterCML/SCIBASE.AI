"use strict";

const { evaluateArtifactPackage } = require("./index");

const packageInput = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  project: { id: "proj-ocean-sensor-2026", title: "Ocean sensor reproducibility package" },
  metadata: {
    datacite: {
      identifier: "10.5555/scibase.ocean-sensor.2026",
      creators: ["C. Oceanographer", "D. Data Steward"],
      titles: ["Ocean sensor reproducibility package"],
      publisher: "SCIBASE.AI",
      publicationYear: "2026",
      resourceType: "Dataset and software",
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Ocean sensor reproducibility package",
    },
    schemaOrg: {
      "@type": "Dataset",
      name: "Ocean sensor reproducibility package",
    },
  },
  artifacts: [
    {
      id: "sensor-readings",
      path: "data/sensor-readings.parquet",
      bytes: 18_000_000,
      hash: "1".repeat(64),
      license: "CC-BY-4.0",
      access: "public",
      version: 2,
      previousVersionHash: "2".repeat(64),
      metadata: { title: "Sensor readings", creators: ["C. Oceanographer"], keywords: ["ocean", "sensor"] },
    },
    {
      id: "calibration-notebook",
      path: "notebooks/calibration.ipynb",
      bytes: 900_000,
      hash: "3".repeat(64),
      license: "MIT",
      access: "public",
      metadata: { title: "Calibration notebook", creators: ["D. Data Steward"], keywords: ["calibration"] },
    },
    {
      id: "temperature-map",
      path: "figures/temperature-map.png",
      bytes: 850_000,
      hash: "4".repeat(64),
      license: "CC-BY-4.0",
      access: "restricted",
      accessJustification: "review-only embargo before journal supplement release",
      reviewerAccessWindow: "2026-05-17/2026-06-17",
      metadata: { title: "Temperature anomaly map", creators: ["D. Data Steward"], keywords: ["figure"] },
    },
  ],
  environments: [
    {
      id: "python-reproducer",
      name: "Pinned Python notebook runner",
      image: "ghcr.io/scibase/ocean-runner@sha256:" + "5".repeat(64),
      runtimes: ["python", "jupyter"],
      trigger: "run-analysis-button",
      commands: [
        {
          id: "reproduce-calibration",
          label: "Reproduce calibration",
          command: "python scripts/run_notebook.py notebooks/calibration.ipynb",
          inputs: ["data/sensor-readings.parquet", "notebooks/calibration.ipynb"],
          outputs: ["figures/temperature-map.png"],
        },
      ],
    },
  ],
};

const result = evaluateArtifactPackage(packageInput);

console.log("Artifact package integrity demo");
console.log(JSON.stringify(result.dashboard, null, 2));
console.log("Preview plan:");
for (const artifact of result.artifacts) {
  console.log(`- ${artifact.path}: ${artifact.preview.previewKind} (${artifact.classification.category})`);
}
console.log("Export packet:");
console.log(JSON.stringify(result.exportPacket, null, 2));
