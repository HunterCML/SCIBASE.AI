"use strict";

const {
  buildRepositoryManifest,
  createExportAttestation,
  planMergeCitationImpact
} = require("./index");

const base = buildRepositoryManifest({
  repositoryId: "scibase/demo-project",
  version: "0.8.3",
  license: "MIT",
  doi: "10.5555/scibase.demo",
  authors: ["Researcher One", "Researcher Two"],
  components: [
    {
      id: "paper",
      type: "manuscript",
      path: "paper.md",
      content: "Original repository manuscript.",
      environmentHash: "pandoc-3.1"
    },
    {
      id: "analysis",
      type: "code",
      path: "analysis/notebook.ipynb",
      content: "mean(control) - mean(treatment)",
      environmentHash: "python-3.12-numpy-2"
    }
  ]
});

const incoming = buildRepositoryManifest({
  repositoryId: "researcher/forked-demo-project",
  version: "0.9.0",
  license: "MIT",
  doi: "10.5555/scibase.demo.fork",
  authors: ["Researcher One", "Researcher Two", "Reviewer Three"],
  parentForks: [{ repositoryId: "scibase/demo-project", version: "0.8.3", doi: "10.5555/scibase.demo" }],
  components: [
    {
      id: "paper",
      type: "manuscript",
      path: "paper.md",
      content: "Updated manuscript with validated sensitivity analysis.",
      environmentHash: "pandoc-3.1"
    },
    {
      id: "analysis",
      type: "code",
      path: "analysis/notebook.ipynb",
      content: "bootstrap_ci(treatment, control)",
      environmentHash: "python-3.12-numpy-2"
    },
    {
      id: "result-table",
      type: "results",
      path: "results/bootstrap.csv",
      content: "estimate,lower,upper\n0.42,0.31,0.54",
      environmentHash: "python-3.12-numpy-2"
    }
  ]
});

const plan = planMergeCitationImpact({ base, incoming });
const attestation = createExportAttestation(plan);

console.log(JSON.stringify({
  releaseDecision: plan.releaseDecision,
  nextVersion: plan.nextVersion,
  addedComponents: plan.diff.added.map((component) => component.id),
  changedComponents: plan.diff.changed.map((item) => item.after.id),
  citationChanges: plan.citationChanges,
  attestation
}, null, 2));

