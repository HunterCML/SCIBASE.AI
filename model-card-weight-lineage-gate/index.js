const crypto = require("crypto");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isActiveEmbargo(embargoUntil, now = new Date()) {
  if (!embargoUntil) return false;
  const embargoDate = new Date(embargoUntil);
  return Number.isFinite(embargoDate.getTime()) && embargoDate > now;
}

function addFinding(findings, severity, code, message, target, remediation) {
  findings.push({
    severity,
    code,
    message,
    target,
    remediation,
  });
}

function missingKeys(source, keys) {
  return keys.filter((key) => {
    const value = source ? source[key] : undefined;
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || value === "";
  });
}

function summarizeFindings(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    },
    { blocker: 0, warning: 0, info: 0 },
  );
}

function evaluateModelWeights(packageInput, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const model = packageInput || {};
  const artifacts = model.artifacts || {};
  const modelCard = model.modelCard || {};
  const lineage = model.lineage || {};
  const access = model.access || {};
  const rerun = model.rerun || {};
  const previous = model.previousSnapshot || {};
  const findings = [];

  for (const key of missingKeys(model, ["modelId", "version", "owner"])) {
    addFinding(
      findings,
      "blocker",
      "MODEL_IDENTITY_MISSING",
      `Missing model package field: ${key}`,
      "model",
      "Add a stable model id, semantic version, and accountable owner before publishing hosted weights.",
    );
  }

  for (const key of missingKeys(artifacts.weights, ["path", "sha256", "format", "framework", "bytes"])) {
    addFinding(
      findings,
      "blocker",
      "WEIGHTS_EVIDENCE_MISSING",
      `Missing trained-weight artifact evidence: ${key}`,
      "artifacts.weights",
      "Attach content hash, format, framework, byte size, and storage path for the model weight artifact.",
    );
  }

  const requiredCardSections = [
    "intendedUse",
    "limitations",
    "trainingData",
    "evaluation",
    "license",
    "ethicalConsiderations",
  ];
  for (const key of missingKeys(modelCard, requiredCardSections)) {
    addFinding(
      findings,
      "blocker",
      "MODEL_CARD_INCOMPLETE",
      `Model card is missing ${key}.`,
      "modelCard",
      "Complete the model-card section so preview and reuse reviewers can judge scope, risks, and allowed use.",
    );
  }

  const datasets = asArray(lineage.trainingDatasets);
  if (datasets.length === 0) {
    addFinding(
      findings,
      "blocker",
      "TRAINING_DATA_ABSENT",
      "No training datasets are linked to the model package.",
      "lineage.trainingDatasets",
      "List each training dataset with a content hash, license, consent basis, and visibility status.",
    );
  }

  for (const dataset of datasets) {
    const label = dataset.id || dataset.name || "training dataset";
    for (const key of missingKeys(dataset, ["hash", "license", "consentBasis"])) {
      addFinding(
        findings,
        "blocker",
        "TRAINING_DATA_PROVENANCE_GAP",
        `${label} is missing ${key}.`,
        "lineage.trainingDatasets",
        "Record dataset hash, license, consent basis, and access restrictions for every training input.",
      );
    }

    if (isActiveEmbargo(dataset.embargoUntil, now)) {
      addFinding(
        findings,
        "blocker",
        "TRAINING_DATA_EMBARGO_ACTIVE",
        `${label} is embargoed until ${dataset.embargoUntil}.`,
        "lineage.trainingDatasets",
        "Hold public preview or reuse until the embargo expires or a reviewer-specific access packet is approved.",
      );
    }

    if (normalizeText(dataset.access) === "restricted" && !dataset.dataUseAgreement) {
      addFinding(
        findings,
        "blocker",
        "RESTRICTED_DATA_DUA_MISSING",
        `${label} is restricted but has no data-use agreement evidence.`,
        "lineage.trainingDatasets",
        "Attach data-use agreement evidence before allowing model preview, export, or reuse.",
      );
    }
  }

  for (const key of missingKeys(lineage.codeSnapshot, ["repository", "commit", "hash"])) {
    addFinding(
      findings,
      "blocker",
      "CODE_LINEAGE_MISSING",
      `Code snapshot is missing ${key}.`,
      "lineage.codeSnapshot",
      "Pin the repository, commit, and source hash used to train the weight artifact.",
    );
  }

  for (const key of missingKeys(lineage.environment, ["runtime", "lockfileHash", "containerHash", "reproduceCommand"])) {
    addFinding(
      findings,
      "blocker",
      "ENVIRONMENT_LINEAGE_MISSING",
      `Executable environment is missing ${key}.`,
      "lineage.environment",
      "Pin runtime, package lock, container hash, and reproduce command for rerun-ready hosted models.",
    );
  }

  const metrics = asArray(lineage.evaluation && lineage.evaluation.metrics);
  if (metrics.length === 0) {
    addFinding(
      findings,
      "blocker",
      "EVALUATION_EVIDENCE_MISSING",
      "No evaluation metrics are attached to the model package.",
      "lineage.evaluation",
      "Attach benchmark names, metric values, and result hashes before enabling model discovery.",
    );
  }

  if (normalizeText(access.visibility) === "public" && normalizeText(access.license) === "unknown") {
    addFinding(
      findings,
      "blocker",
      "PUBLIC_LICENSE_UNKNOWN",
      "Public model package has an unknown license.",
      "access.license",
      "Select a known license or hold the public release until legal review completes.",
    );
  }

  if (isActiveEmbargo(access.embargoUntil, now)) {
    addFinding(
      findings,
      "blocker",
      "MODEL_EMBARGO_ACTIVE",
      `The model package is under embargo until ${access.embargoUntil}.`,
      "access.embargoUntil",
      "Keep preview metadata-only or route through approved reviewer access until embargo expiry.",
    );
  }

  if (!rerun.command || !rerun.outputHash || !rerun.status) {
    addFinding(
      findings,
      "blocker",
      "RERUN_EVIDENCE_INCOMPLETE",
      "Reproducibility rerun evidence is incomplete.",
      "rerun",
      "Record rerun command, status, output hash, and log hash before enabling reproduce buttons.",
    );
  } else if (normalizeText(rerun.status) !== "passed") {
    addFinding(
      findings,
      "blocker",
      "RERUN_FAILED",
      `Reproducibility rerun status is ${rerun.status}.`,
      "rerun.status",
      "Hold the model package until rerun output matches the reported training/evaluation record.",
    );
  }

  if (rerun.expectedOutputHash && rerun.outputHash && rerun.expectedOutputHash !== rerun.outputHash) {
    addFinding(
      findings,
      "blocker",
      "RERUN_OUTPUT_DRIFT",
      "Rerun output hash does not match the expected output hash.",
      "rerun.outputHash",
      "Regenerate the result packet or update model lineage after investigating the output drift.",
    );
  }

  if (previous.version && previous.version === model.version && previous.weightsSha256 && artifacts.weights) {
    if (previous.weightsSha256 !== artifacts.weights.sha256) {
      addFinding(
        findings,
        "blocker",
        "WEIGHT_HASH_CHANGED_WITHOUT_VERSION_BUMP",
        "Weight hash changed while the model version stayed the same.",
        "version",
        "Bump the model version, update citations, and regenerate DataCite/schema.org metadata.",
      );
    }
  }

  if (previous.trainingDataDigest && datasets.length > 0) {
    const currentTrainingDigest = digest(
      datasets.map((dataset) => ({
        id: dataset.id,
        hash: dataset.hash,
        license: dataset.license,
        consentBasis: dataset.consentBasis,
      })),
    );
    if (previous.trainingDataDigest !== currentTrainingDigest && !lineage.evaluation.updatedForTrainingDataChange) {
      addFinding(
        findings,
        "warning",
        "TRAINING_DATA_CHANGED_WITHOUT_EVALUATION_REFRESH",
        "Training-data lineage changed without an evaluation refresh marker.",
        "lineage.evaluation",
        "Refresh evaluation metrics or attach a waiver explaining why the prior metrics remain valid.",
      );
    }
  }

  if (artifacts.weights && artifacts.weights.bytes > 5 * 1024 * 1024 * 1024 && !artifacts.weights.largeFileRoute) {
    addFinding(
      findings,
      "warning",
      "LARGE_MODEL_STORAGE_ROUTE_MISSING",
      "Weight artifact exceeds 5 GiB without a large-file storage route.",
      "artifacts.weights.largeFileRoute",
      "Route large model weights through LFS/object storage and preserve persistent export links.",
    );
  }

  const counts = summarizeFindings(findings);
  const decision = counts.blocker > 0 ? "hold" : counts.warning > 0 ? "review" : "ready";
  const reviewerActions = findings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    target: finding.target,
    action: finding.remediation,
  }));

  const metadata = buildMetadata(model, artifacts, lineage, decision);
  const packageDigest = digest({
    modelId: model.modelId,
    version: model.version,
    owner: model.owner,
    weights: artifacts.weights,
    modelCard,
    lineage,
    access,
    rerun,
    decision,
    findings,
  });

  return {
    decision,
    counts,
    findings,
    reviewerActions,
    datacite: metadata.datacite,
    schemaOrg: metadata.schemaOrg,
    auditDigest: packageDigest,
  };
}

function buildMetadata(model, artifacts, lineage, decision) {
  const title = model.title || model.modelId || "Hosted model weights";
  const creators = asArray(model.creators).map((creator) => ({
    name: creator.name,
    nameIdentifiers: creator.orcid ? [{ nameIdentifier: creator.orcid, schemeUri: "https://orcid.org" }] : [],
  }));

  return {
    datacite: {
      identifier: model.doi || `scibase:${model.modelId}:${model.version}`,
      creators,
      titles: [{ title }],
      publisher: model.owner || "SCIBASE.AI",
      publicationYear: String(model.publicationYear || new Date().getUTCFullYear()),
      resourceType: "Model weights",
      version: model.version,
      relatedIdentifiers: asArray(lineage.trainingDatasets).map((dataset) => ({
        relatedIdentifier: dataset.doi || dataset.id,
        relationType: "IsDerivedFrom",
      })),
      rightsList: [{ rights: artifacts.weights && artifacts.weights.license ? artifacts.weights.license : "unspecified" }],
      descriptions: [{ descriptionType: "TechnicalInfo", description: `Release decision: ${decision}` }],
    },
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: title,
      identifier: model.doi || `scibase:${model.modelId}:${model.version}`,
      version: model.version,
      creator: creators.map((creator) => creator.name),
      encodingFormat: artifacts.weights && artifacts.weights.format,
      isBasedOn: asArray(lineage.trainingDatasets).map((dataset) => dataset.id || dataset.name),
      softwareRequirements: lineage.environment && lineage.environment.runtime,
      license: artifacts.weights && artifacts.weights.license,
      measurementTechnique:
        lineage.evaluation && asArray(lineage.evaluation.metrics).map((metric) => metric.name).join(", "),
    },
  };
}

module.exports = {
  evaluateModelWeights,
  stableStringify,
  digest,
};
