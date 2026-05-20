const crypto = require("crypto");

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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function missing(source, keys) {
  return keys.filter((key) => {
    const value = source ? source[key] : undefined;
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || value === "";
  });
}

function addFinding(findings, severity, code, message, target, remediation) {
  findings.push({ severity, code, message, target, remediation });
}

function countFindings(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    },
    { blocker: 0, warning: 0, info: 0 },
  );
}

function evaluateRepositoryTombstone(packet) {
  const repository = packet || {};
  const snapshot = repository.snapshot || {};
  const doi = repository.doi || {};
  const replacement = repository.replacement || {};
  const redirects = repository.redirects || {};
  const provenance = repository.provenance || {};
  const reproducibility = repository.reproducibility || {};
  const metadata = repository.metadata || {};
  const findings = [];

  for (const key of missing(repository, ["repositoryId", "version", "action", "reason"])) {
    addFinding(
      findings,
      "blocker",
      "REPOSITORY_TOMBSTONE_IDENTITY_MISSING",
      `Missing repository tombstone field: ${key}`,
      "repository",
      "Record the repository id, version, action, and reason before withdrawing or superseding a scientific release.",
    );
  }

  if (!["withdraw", "supersede", "correct"].includes(normalize(repository.action))) {
    addFinding(
      findings,
      "blocker",
      "UNSUPPORTED_TOMBSTONE_ACTION",
      `Unsupported tombstone action: ${repository.action}`,
      "action",
      "Use withdraw, supersede, or correct so DOI/citation behavior is predictable.",
    );
  }

  for (const key of missing(snapshot, ["hash", "storageUri", "createdAt"])) {
    addFinding(
      findings,
      "blocker",
      "IMMUTABLE_SNAPSHOT_MISSING",
      `Immutable release snapshot is missing ${key}.`,
      "snapshot",
      "Pin an immutable release snapshot with hash, storage URI, and creation timestamp.",
    );
  }

  if (snapshot.mutable === true) {
    addFinding(
      findings,
      "blocker",
      "SNAPSHOT_NOT_IMMUTABLE",
      "Release snapshot is marked mutable.",
      "snapshot.mutable",
      "Freeze the release snapshot or create a new immutable archive copy before changing DOI targets.",
    );
  }

  if (snapshot.currentHash && snapshot.hash && snapshot.currentHash !== snapshot.hash) {
    addFinding(
      findings,
      "blocker",
      "SNAPSHOT_HASH_DRIFT",
      "Current repository hash differs from the archived release snapshot hash.",
      "snapshot.currentHash",
      "Preserve the archived hash and create a new version for changed repository content.",
    );
  }

  for (const key of missing(doi, ["current", "targetStatus", "dataciteRecord"])) {
    addFinding(
      findings,
      "blocker",
      "DOI_RECORD_INCOMPLETE",
      `DOI record is missing ${key}.`,
      "doi",
      "Keep DOI, target status, and DataCite tombstone metadata complete for citation continuity.",
    );
  }

  if (normalize(repository.action) === "supersede") {
    for (const key of missing(replacement, ["version", "doi", "snapshotHash"])) {
      addFinding(
        findings,
        "blocker",
        "SUPERSESSION_TARGET_MISSING",
        `Supersession target is missing ${key}.`,
        "replacement",
        "Attach replacement version, DOI, and snapshot hash before redirecting citations.",
      );
    }
  }

  const requiredRedirects = ["doi", "api", "exportBundle", "citationBadge"];
  for (const key of missing(redirects, requiredRedirects)) {
    addFinding(
      findings,
      "blocker",
      "REDIRECT_MAP_INCOMPLETE",
      `Redirect map is missing ${key}.`,
      "redirects",
      "Map DOI, REST API, export bundle, and cite-this-project badge traffic to the tombstone or replacement target.",
    );
  }

  if (redirects.doi && normalize(redirects.doi.destination) === "deleted") {
    addFinding(
      findings,
      "blocker",
      "DOI_REDIRECT_DELETES_TARGET",
      "DOI redirect destination deletes the release target.",
      "redirects.doi",
      "Redirect to a tombstone page or replacement DOI, never to a missing resource.",
    );
  }

  const citations = asArray(provenance.downstreamCitations);
  if (citations.length > 0 && !provenance.citationNoticePacket) {
    addFinding(
      findings,
      "blocker",
      "DOWNSTREAM_CITATION_NOTICE_MISSING",
      `${citations.length} downstream citation(s) exist without a citation notice packet.`,
      "provenance.citationNoticePacket",
      "Generate notices that preserve original citation text while pointing readers to tombstone or replacement context.",
    );
  }

  const forks = asArray(provenance.forks);
  if (forks.length > 0 && !provenance.forkNoticePacket) {
    addFinding(
      findings,
      "warning",
      "FORK_NOTICE_MISSING",
      `${forks.length} fork(s) exist without a provenance notice packet.`,
      "provenance.forkNoticePacket",
      "Notify derivative repositories and merge-request owners before changing version targets.",
    );
  }

  for (const key of missing(reproducibility, ["status", "pipeline", "lastRunHash"])) {
    addFinding(
      findings,
      "blocker",
      "REPRODUCIBILITY_STATUS_MISSING",
      `Reproducibility record is missing ${key}.`,
      "reproducibility",
      "Record pipeline name, status, and last run hash so readers know whether the withdrawn or superseded version reruns.",
    );
  }

  if (normalize(reproducibility.status) === "failed" && !reproducibility.failureSummary) {
    addFinding(
      findings,
      "blocker",
      "REPRODUCIBILITY_FAILURE_UNEXPLAINED",
      "Reproducibility failed without a public failure summary.",
      "reproducibility.failureSummary",
      "Attach a concise failure summary to the tombstone and replacement recommendation.",
    );
  }

  for (const key of missing(metadata, ["license", "datacite", "schemaOrg"])) {
    addFinding(
      findings,
      "blocker",
      "EXPORT_METADATA_INCOMPLETE",
      `Export metadata is missing ${key}.`,
      "metadata",
      "Keep license, DataCite, and schema.org metadata complete across the tombstone transition.",
    );
  }

  const counts = countFindings(findings);
  const decision = counts.blocker > 0 ? "hold" : counts.warning > 0 ? "review" : "ready";
  const datacite = buildDatacite(repository, decision);
  const schemaOrg = buildSchemaOrg(repository, decision);
  const auditDigest = digest({
    repository,
    findings,
    decision,
    datacite,
    schemaOrg,
  });

  return {
    decision,
    counts,
    findings,
    reviewerActions: findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      target: finding.target,
      action: finding.remediation,
    })),
    datacite,
    schemaOrg,
    auditDigest,
  };
}

function buildDatacite(repository, decision) {
  const relationType =
    normalize(repository.action) === "supersede" ? "IsObsoletedBy" : normalize(repository.action) === "correct" ? "IsNewVersionOf" : "IsWithdrawnBy";

  return {
    identifier: repository.doi && repository.doi.current,
    titles: [{ title: repository.title || repository.repositoryId }],
    version: repository.version,
    publisher: repository.publisher || "SCIBASE.AI",
    publicationYear: String(repository.publicationYear || new Date().getUTCFullYear()),
    resourceType: "Scientific project repository",
    relatedIdentifiers: repository.replacement && repository.replacement.doi
      ? [{ relatedIdentifier: repository.replacement.doi, relationType }]
      : [],
    descriptions: [
      {
        descriptionType: "Other",
        description: `Repository version transition decision: ${decision}. Reason: ${repository.reason || "not provided"}`,
      },
    ],
  };
}

function buildSchemaOrg(repository, decision) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: repository.title || repository.repositoryId,
    version: repository.version,
    identifier: repository.doi && repository.doi.current,
    codeRepository: repository.repositoryUrl,
    archivedAt: repository.snapshot && repository.snapshot.storageUri,
    isBasedOn: repository.replacement && repository.replacement.doi,
    creativeWorkStatus: decision === "ready" ? repository.action : "reviewHold",
    license: repository.metadata && repository.metadata.license,
  };
}

module.exports = {
  evaluateRepositoryTombstone,
  stableStringify,
  digest,
};
