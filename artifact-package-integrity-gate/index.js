"use strict";

const crypto = require("node:crypto");
const path = require("node:path");

const DEFAULT_POLICY = {
  maxInlinePreviewBytes: 25 * 1024 * 1024,
  largeArtifactBytes: 2 * 1024 * 1024 * 1024,
  requiredMetadataFields: ["identifier", "creators", "titles", "publisher", "publicationYear", "resourceType"],
  requiredArtifactMetadataFields: ["title", "creators", "keywords"],
  acceptedLicenses: ["CC-BY-4.0", "CC0-1.0", "MIT", "Apache-2.0", "BSD-3-Clause"],
  minimumFairScore: 80,
  persistentLinkBase: "https://scibase.ai/artifacts",
};

const TYPE_BY_EXTENSION = {
  ".csv": { category: "dataset", previewKind: "tabular-preview", metadataKind: "Dataset" },
  ".tsv": { category: "dataset", previewKind: "tabular-preview", metadataKind: "Dataset" },
  ".xlsx": { category: "dataset", previewKind: "spreadsheet-preview", metadataKind: "Dataset" },
  ".json": { category: "dataset", previewKind: "json-tree-preview", metadataKind: "Dataset" },
  ".parquet": { category: "dataset", previewKind: "schema-preview", metadataKind: "Dataset" },
  ".py": { category: "code", previewKind: "code-viewer", metadataKind: "SoftwareSourceCode" },
  ".r": { category: "code", previewKind: "code-viewer", metadataKind: "SoftwareSourceCode" },
  ".jl": { category: "code", previewKind: "code-viewer", metadataKind: "SoftwareSourceCode" },
  ".ipynb": { category: "notebook", previewKind: "notebook-render", metadataKind: "SoftwareSourceCode" },
  ".png": { category: "figure", previewKind: "image-thumbnail", metadataKind: "ImageObject" },
  ".jpg": { category: "figure", previewKind: "image-thumbnail", metadataKind: "ImageObject" },
  ".jpeg": { category: "figure", previewKind: "image-thumbnail", metadataKind: "ImageObject" },
  ".svg": { category: "figure", previewKind: "image-thumbnail", metadataKind: "ImageObject" },
  ".mp4": { category: "media", previewKind: "media-thumbnail", metadataKind: "VideoObject" },
  ".h5": { category: "model", previewKind: "model-summary", metadataKind: "DataDownload" },
  ".onnx": { category: "model", previewKind: "model-summary", metadataKind: "DataDownload" },
  ".pt": { category: "model", previewKind: "model-summary", metadataKind: "DataDownload" },
};

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(Boolean).map(String).sort();
}

function classifyArtifact(artifact) {
  const extension = path.extname(artifact.path || artifact.name || "").toLowerCase();
  const known = TYPE_BY_EXTENSION[extension] || {
    category: "supplement",
    previewKind: "download-only",
    metadataKind: "CreativeWork",
  };

  return {
    extension: extension || "none",
    category: known.category,
    previewKind: known.previewKind,
    metadataKind: known.metadataKind,
    executable: ["code", "notebook"].includes(known.category),
  };
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function hasPinnedRuntimeImage(value) {
  return typeof value === "string" && (value.includes("@sha256:") || value.startsWith("sha256:"));
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && value !== "";
}

function makeFinding(target, severity, message, action) {
  return { target, severity, message, action };
}

function severityWeight(severity) {
  return { blocker: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function compareFindings(a, b) {
  const severityDelta = severityWeight(b.severity) - severityWeight(a.severity);
  if (severityDelta !== 0) {
    return severityDelta;
  }
  return `${a.target}:${a.message}`.localeCompare(`${b.target}:${b.message}`);
}

function validateArtifact(artifact, policy) {
  const classification = classifyArtifact(artifact);
  const findings = [];
  const metadata = artifact.metadata || {};

  if (!artifact.id) {
    findings.push(makeFinding(artifact.path || "artifact", "blocker", "artifact lacks stable id", "assign a UUID or repository-local artifact id"));
  }

  if (!artifact.path) {
    findings.push(makeFinding(artifact.id || "artifact", "blocker", "artifact lacks repository path", "record the hosted path before export"));
  }

  if (!isSha256(artifact.hash)) {
    findings.push(makeFinding(artifact.id || artifact.path, "blocker", "artifact lacks sha256 content hash", "store a deterministic sha256 digest"));
  }

  for (const field of policy.requiredArtifactMetadataFields) {
    if (!hasValue(metadata[field])) {
      findings.push(makeFinding(artifact.id || artifact.path, "high", `artifact metadata missing ${field}`, "complete reviewer-facing metadata"));
    }
  }

  if (!policy.acceptedLicenses.includes(artifact.license)) {
    findings.push(makeFinding(artifact.id || artifact.path, "high", "artifact license is missing or unsupported", "attach a reusable license or restrict export"));
  }

  if (artifact.access === "restricted" && (!artifact.accessJustification || !artifact.reviewerAccessWindow)) {
    findings.push(
      makeFinding(
        artifact.id || artifact.path,
        "high",
        "restricted artifact lacks reviewer access evidence",
        "record access justification and review window"
      )
    );
  }

  if ((artifact.bytes || 0) > policy.largeArtifactBytes && artifact.storageTier !== "object-storage") {
    findings.push(
      makeFinding(
        artifact.id || artifact.path,
        "medium",
        "large artifact is not routed to object storage",
        "move large payload to object storage with a persistent link"
      )
    );
  }

  if ((artifact.version || 1) > 1 && !artifact.previousVersionHash) {
    findings.push(
      makeFinding(
        artifact.id || artifact.path,
        "medium",
        "versioned artifact lacks previous version hash",
        "link the prior artifact hash for diff and rollback"
      )
    );
  }

  const inlinePreview = (artifact.bytes || 0) <= policy.maxInlinePreviewBytes;
  const preview = {
    artifactId: artifact.id,
    path: artifact.path,
    category: classification.category,
    previewKind: inlinePreview ? classification.previewKind : "deferred-preview",
    metadataKind: classification.metadataKind,
    inlinePreview,
    reason: inlinePreview ? "safe for metadata-aware preview" : "preview generated asynchronously for large payload",
  };

  return {
    id: artifact.id,
    path: artifact.path,
    hash: artifact.hash,
    license: artifact.license,
    access: artifact.access || "public",
    bytes: artifact.bytes || 0,
    version: artifact.version || 1,
    classification,
    preview,
    findings,
  };
}

function validateMetadata(metadata, policy) {
  const findings = [];
  const datacite = metadata.datacite || {};
  const jsonLd = metadata.jsonLd || {};
  const schemaOrg = metadata.schemaOrg || {};

  for (const field of policy.requiredMetadataFields) {
    if (!hasValue(datacite[field])) {
      findings.push(makeFinding("datacite", "high", `DataCite metadata missing ${field}`, "complete the required DataCite field"));
    }
  }

  if (!jsonLd["@context"] || !jsonLd["@type"]) {
    findings.push(makeFinding("json-ld", "high", "JSON-LD context or type is missing", "publish machine-readable JSON-LD"));
  }

  if (!schemaOrg["@type"] || !schemaOrg.name) {
    findings.push(makeFinding("schema.org", "high", "schema.org type or name is missing", "publish discoverable schema.org markup"));
  }

  const totalChecks = policy.requiredMetadataFields.length + 4;
  const failedChecks = findings.length;
  const score = Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100));

  return {
    datacite,
    jsonLd,
    schemaOrg,
    score,
    findings,
  };
}

function validateEnvironments(environments, artifactPaths) {
  const findings = [];
  const plans = [];

  for (const environment of environments) {
    const envFindings = [];
    if (!environment.id) {
      envFindings.push(makeFinding(environment.name || "environment", "blocker", "environment lacks stable id", "assign a stable runtime id"));
    }
    if (!hasPinnedRuntimeImage(environment.image)) {
      envFindings.push(
        makeFinding(
          environment.id || environment.name,
          "high",
          "runtime image is not pinned by digest",
          "pin Docker or OCI image with sha256 digest"
        )
      );
    }
    if (normalizeList(environment.runtimes).length === 0) {
      envFindings.push(makeFinding(environment.id || environment.name, "medium", "runtime stack is not declared", "declare Python, R, Julia, or model runtime"));
    }

    const commands = Array.isArray(environment.commands) ? environment.commands : [];
    if (commands.length === 0) {
      envFindings.push(makeFinding(environment.id || environment.name, "medium", "environment has no executable commands", "add rerun or reproduce commands"));
    }

    const runnableCommands = commands.map((command) => {
      const missingInputs = normalizeList(command.inputs).filter((input) => !artifactPaths.has(input));
      if (missingInputs.length > 0) {
        envFindings.push(
          makeFinding(
            `${environment.id || environment.name}:${command.id || command.label}`,
            "blocker",
            `command references missing inputs: ${missingInputs.join(", ")}`,
            "attach every command input as a hosted artifact"
          )
        );
      }

      return {
        id: command.id,
        label: command.label,
        command: command.command,
        inputs: normalizeList(command.inputs),
        outputs: normalizeList(command.outputs),
        eligible: missingInputs.length === 0 && hasPinnedRuntimeImage(environment.image),
      };
    });

    const plan = {
      id: environment.id,
      name: environment.name,
      image: environment.image,
      runtimes: normalizeList(environment.runtimes),
      trigger: environment.trigger || "manual",
      commands: runnableCommands,
      ready: envFindings.filter((finding) => finding.severity === "blocker" || finding.severity === "high").length === 0,
    };

    plans.push(plan);
    findings.push(...envFindings);
  }

  if (environments.length === 0) {
    findings.push(makeFinding("environments", "high", "no executable environment is registered", "add a pinned runtime with at least one rerun command"));
  }

  return { plans, findings };
}

function buildPersistentLinks(artifacts, baseUrl) {
  return artifacts.map((artifact) => ({
    artifactId: artifact.id,
    path: artifact.path,
    href: `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(artifact.id || artifact.path)}`,
    access: artifact.access,
  }));
}

function evaluateArtifactPackage(input, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}), ...(options.policy || {}) };
  const artifacts = Array.isArray(input.artifacts) ? input.artifacts : [];
  const environments = Array.isArray(input.environments) ? input.environments : [];
  const metadata = input.metadata || {};

  const artifactReports = artifacts.map((artifact) => validateArtifact(artifact, policy));
  const artifactPaths = new Set(artifactReports.map((artifact) => artifact.path).filter(Boolean));
  const metadataReport = validateMetadata(metadata, policy);
  const environmentReport = validateEnvironments(environments, artifactPaths);

  const findings = [
    ...artifactReports.flatMap((artifact) => artifact.findings),
    ...metadataReport.findings,
    ...environmentReport.findings,
  ].sort(compareFindings);

  const blockerCount = findings.filter((finding) => finding.severity === "blocker").length;
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const previewableArtifacts = artifactReports.filter((artifact) => artifact.preview.previewKind !== "download-only").length;
  const runnableCommands = environmentReport.plans.flatMap((plan) => plan.commands).filter((command) => command.eligible).length;
  const categoryCounts = artifactReports.reduce((counts, artifact) => {
    counts[artifact.classification.category] = (counts[artifact.classification.category] || 0) + 1;
    return counts;
  }, {});

  const sourceDigest = stableDigest({ artifacts, metadata, environments });
  const exportPacket = {
    scope: "scientific-artifact-package-integrity",
    projectId: input.project && input.project.id ? input.project.id : "unassigned-project",
    generatedAt: input.generatedAt || new Date(0).toISOString(),
    sourceDigest,
    packageDigest: stableDigest({
      sourceDigest,
      previewPlan: artifactReports.map((artifact) => artifact.preview),
      metadataScore: metadataReport.score,
      environmentPlan: environmentReport.plans,
    }),
    persistentLinks: buildPersistentLinks(artifactReports, policy.persistentLinkBase),
  };

  return {
    dashboard: {
      artifacts: artifactReports.length,
      categories: categoryCounts,
      previewableArtifacts,
      executableEnvironments: environmentReport.plans.length,
      runnableCommands,
      metadataScore: metadataReport.score,
      blockers: blockerCount,
      highRiskFindings: highCount,
      packageReady: blockerCount === 0 && highCount === 0 && metadataReport.score >= policy.minimumFairScore,
    },
    artifacts: artifactReports.map(({ findings: _findings, ...artifact }) => artifact),
    metadata: metadataReport,
    environments: environmentReport.plans,
    findings,
    exportPacket,
  };
}

module.exports = {
  DEFAULT_POLICY,
  classifyArtifact,
  evaluateArtifactPackage,
  stableDigest,
};
