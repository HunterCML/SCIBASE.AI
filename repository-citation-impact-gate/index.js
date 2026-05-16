"use strict";

const crypto = require("crypto");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const PERMISSIVE_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC-BY-4.0"
]);
const NON_COMMERCIAL_LICENSES = new Set([
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0"
]);

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stable(value[key]);
        return result;
      }, {});
  }
  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function requireString(record, field) {
  if (!record || typeof record[field] !== "string" || record[field].trim() === "") {
    throw new Error(`Missing required string field: ${field}`);
  }
  return record[field].trim();
}

function normalizeComponent(component) {
  const id = requireString(component, "id");
  const type = requireString(component, "type");
  const path = requireString(component, "path");
  const contentHash = component.contentHash || digest({
    id,
    path,
    content: component.content || ""
  });

  return {
    id,
    type,
    path,
    contentHash,
    environmentHash: component.environmentHash || null,
    reproducible: component.reproducible !== false,
    citation: component.citation || null,
    changedBy: component.changedBy || "unknown"
  };
}

function buildRepositoryManifest(input) {
  const repositoryId = requireString(input, "repositoryId");
  const version = requireString(input, "version");
  const license = requireString(input, "license");

  if (!SEMVER.test(version)) {
    throw new Error(`Version must be semantic version x.y.z: ${version}`);
  }

  const components = (input.components || []).map(normalizeComponent);
  const manifest = {
    repositoryId,
    version,
    license,
    doi: input.doi || null,
    authors: [...(input.authors || [])].sort(),
    parentForks: [...(input.parentForks || [])].sort((a, b) => {
      return String(a.repositoryId).localeCompare(String(b.repositoryId));
    }),
    components: components.sort((a, b) => a.id.localeCompare(b.id))
  };

  return {
    ...manifest,
    manifestDigest: digest(manifest)
  };
}

function byComponentId(components) {
  return new Map(components.map((component) => [component.id, component]));
}

function diffComponents(base, incoming) {
  const baseById = byComponentId(base.components);
  const incomingById = byComponentId(incoming.components);
  const added = [];
  const changed = [];
  const removed = [];

  for (const component of incoming.components) {
    const previous = baseById.get(component.id);
    if (!previous) {
      added.push(component);
    } else if (
      previous.contentHash !== component.contentHash ||
      previous.environmentHash !== component.environmentHash
    ) {
      changed.push({ before: previous, after: component });
    }
  }

  for (const component of base.components) {
    if (!incomingById.has(component.id)) {
      removed.push(component);
    }
  }

  return { added, changed, removed };
}

function suggestNextVersion(version, diff) {
  const match = SEMVER.exec(version);
  if (!match) {
    throw new Error(`Version must be semantic version x.y.z: ${version}`);
  }

  const majorTypes = new Set(["data", "results"]);
  const minorTypes = new Set(["code", "environment", "notebook"]);
  const changedTypes = [
    ...diff.added.map((item) => item.type),
    ...diff.changed.map((item) => item.after.type),
    ...diff.removed.map((item) => item.type)
  ];
  let [major, minor, patch] = match.slice(1).map(Number);

  if (diff.removed.length > 0 || changedTypes.some((type) => majorTypes.has(type))) {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (changedTypes.some((type) => minorTypes.has(type))) {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function licenseDecision(base, incoming, policies) {
  const allowedLicenses = new Set(policies.allowedLicenses || PERMISSIVE_LICENSES);
  const violations = [];

  if (!allowedLicenses.has(incoming.license)) {
    violations.push({
      code: "license_not_allowed",
      message: `${incoming.license} is not in the repository merge allowlist.`
    });
  }

  if (policies.disallowNonCommercial !== false && NON_COMMERCIAL_LICENSES.has(incoming.license)) {
    violations.push({
      code: "non_commercial_license",
      message: "Non-commercial content cannot be merged into a publishable repository track."
    });
  }

  if (policies.requireSameLicense && base.license !== incoming.license) {
    violations.push({
      code: "license_changed",
      message: `Incoming license ${incoming.license} differs from base license ${base.license}.`
    });
  }

  return violations;
}

function attributionDecision(base, incoming) {
  if (base.repositoryId === incoming.repositoryId) {
    return [];
  }

  const parentIds = new Set(incoming.parentForks.map((fork) => fork.repositoryId));
  if (parentIds.has(base.repositoryId)) {
    return [];
  }

  return [{
    code: "missing_parent_attribution",
    message: `Incoming fork ${incoming.repositoryId} does not cite parent repository ${base.repositoryId}.`
  }];
}

function reproducibilityDecision(incoming) {
  return incoming.components
    .filter((component) => component.reproducible === false || !component.environmentHash)
    .map((component) => ({
      code: component.reproducible === false ? "component_not_reproducible" : "missing_environment_hash",
      componentId: component.id,
      message: `${component.id} cannot be accepted without reproducibility evidence.`
    }));
}

function planMergeCitationImpact({ base, incoming, policies = {} }) {
  const diff = diffComponents(base, incoming);
  const blockers = [
    ...licenseDecision(base, incoming, policies),
    ...attributionDecision(base, incoming),
    ...reproducibilityDecision(incoming)
  ];

  const citationChanges = {
    doiChanged: base.doi !== incoming.doi,
    authorsAdded: incoming.authors.filter((author) => !base.authors.includes(author)),
    authorsRemoved: base.authors.filter((author) => !incoming.authors.includes(author))
  };

  return {
    baseRepositoryId: base.repositoryId,
    incomingRepositoryId: incoming.repositoryId,
    releaseDecision: blockers.length === 0 ? "ready" : "hold",
    nextVersion: suggestNextVersion(base.version, diff),
    diff,
    citationChanges,
    blockers,
    requiredAttribution: incoming.parentForks,
    impactDigest: digest({
      base: base.manifestDigest,
      incoming: incoming.manifestDigest,
      diff,
      citationChanges,
      blockers
    })
  };
}

function createExportAttestation(plan) {
  return {
    repositoryId: plan.baseRepositoryId,
    incomingRepositoryId: plan.incomingRepositoryId,
    releaseDecision: plan.releaseDecision,
    nextVersion: plan.nextVersion,
    impactDigest: plan.impactDigest,
    exportDigest: digest({
      repositoryId: plan.baseRepositoryId,
      incomingRepositoryId: plan.incomingRepositoryId,
      releaseDecision: plan.releaseDecision,
      nextVersion: plan.nextVersion,
      impactDigest: plan.impactDigest
    })
  };
}

module.exports = {
  buildRepositoryManifest,
  createExportAttestation,
  diffComponents,
  digest,
  planMergeCitationImpact,
  suggestNextVersion
};

