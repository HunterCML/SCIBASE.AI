"use strict";

const assert = require("assert");
const {
  buildRepositoryManifest,
  createExportAttestation,
  diffComponents,
  planMergeCitationImpact,
  suggestNextVersion
} = require("./index");

const base = buildRepositoryManifest({
  repositoryId: "lab/cancer-atlas",
  version: "1.4.2",
  license: "MIT",
  doi: "10.1000/base",
  authors: ["Ada", "Lin"],
  components: [
    {
      id: "manuscript",
      type: "manuscript",
      path: "paper/main.md",
      content: "base claims",
      environmentHash: "env-paper"
    },
    {
      id: "analysis",
      type: "code",
      path: "src/analysis.R",
      content: "model <- lm(y ~ x)",
      environmentHash: "env-r-4.3"
    }
  ]
});

const fork = buildRepositoryManifest({
  repositoryId: "fork/cancer-atlas-methods",
  version: "1.5.0",
  license: "MIT",
  doi: "10.1000/fork",
  authors: ["Ada", "Lin", "Nia"],
  parentForks: [{ repositoryId: "lab/cancer-atlas", version: "1.4.2", doi: "10.1000/base" }],
  components: [
    {
      id: "manuscript",
      type: "manuscript",
      path: "paper/main.md",
      content: "base claims with updated methods",
      environmentHash: "env-paper"
    },
    {
      id: "analysis",
      type: "code",
      path: "src/analysis.R",
      content: "model <- glm(y ~ x, family = poisson)",
      environmentHash: "env-r-4.3"
    },
    {
      id: "dataset",
      type: "data",
      path: "data/derived.csv",
      content: "id,value\n1,9",
      environmentHash: "env-data-v2"
    }
  ]
});

assert.strictEqual(base.manifestDigest, buildRepositoryManifest({
  repositoryId: "lab/cancer-atlas",
  version: "1.4.2",
  license: "MIT",
  doi: "10.1000/base",
  authors: ["Lin", "Ada"],
  components: [...base.components].reverse()
}).manifestDigest);

const diff = diffComponents(base, fork);
assert.strictEqual(diff.added.length, 1);
assert.strictEqual(diff.changed.length, 2);
assert.strictEqual(suggestNextVersion("1.4.2", diff), "2.0.0");

const readyPlan = planMergeCitationImpact({ base, incoming: fork });
assert.strictEqual(readyPlan.releaseDecision, "ready");
assert.deepStrictEqual(readyPlan.citationChanges.authorsAdded, ["Nia"]);
assert.ok(readyPlan.impactDigest.length > 20);

const blockedFork = buildRepositoryManifest({
  repositoryId: "fork/cancer-atlas-private",
  version: "1.5.0",
  license: "CC-BY-NC-4.0",
  authors: ["Ada"],
  components: [{
    id: "analysis",
    type: "code",
    path: "src/private.R",
    content: "not reproducible",
    reproducible: false
  }]
});

const blockedPlan = planMergeCitationImpact({
  base,
  incoming: blockedFork,
  policies: { requireSameLicense: true }
});

assert.strictEqual(blockedPlan.releaseDecision, "hold");
assert.ok(blockedPlan.blockers.some((blocker) => blocker.code === "missing_parent_attribution"));
assert.ok(blockedPlan.blockers.some((blocker) => blocker.code === "non_commercial_license"));
assert.ok(blockedPlan.blockers.some((blocker) => blocker.code === "component_not_reproducible"));

const attestation = createExportAttestation(readyPlan);
assert.strictEqual(attestation.nextVersion, "2.0.0");
assert.strictEqual(attestation.releaseDecision, "ready");
assert.ok(attestation.exportDigest);

console.log("repository-citation-impact-gate tests passed");

