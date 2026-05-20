const fs = require("fs");
const path = require("path");
const { evaluateRepositoryTombstone } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const readyTransition = {
  repositoryId: "scibase/neuro-methods-atlas",
  repositoryUrl: "https://scibase.ai/projects/neuro-methods-atlas",
  title: "Neuro Methods Atlas",
  version: "1.4.0",
  action: "supersede",
  reason: "Version 1.4.0 is superseded because an updated tagged version fixes citation metadata and rerun notes.",
  snapshot: {
    hash: "sha256:neuro-atlas-140",
    currentHash: "sha256:neuro-atlas-140",
    storageUri: "s3://scibase-archives/neuro-methods-atlas/1.4.0.tar.gz",
    createdAt: "2026-05-11T15:00:00Z",
    mutable: false,
  },
  doi: {
    current: "10.5555/scibase.neuro-atlas.v1.4.0",
    targetStatus: "tombstone-with-replacement",
    dataciteRecord: "datacite:neuro-atlas-v140",
  },
  replacement: {
    version: "1.4.1",
    doi: "10.5555/scibase.neuro-atlas.v1.4.1",
    snapshotHash: "sha256:neuro-atlas-141",
  },
  redirects: {
    doi: { destination: "replacement", target: "10.5555/scibase.neuro-atlas.v1.4.1" },
    api: { destination: "tombstone", target: "/api/projects/neuro-methods-atlas/versions/1.4.0/tombstone" },
    exportBundle: { destination: "archive", target: "s3://scibase-archives/neuro-methods-atlas/1.4.0.tar.gz" },
    citationBadge: { destination: "replacement", target: "10.5555/scibase.neuro-atlas.v1.4.1" },
  },
  provenance: {
    downstreamCitations: ["doi:10.4444/neuro.paper.88"],
    forks: ["scibase/neuro-methods-atlas-extension"],
    citationNoticePacket: "sha256:citation-notice-neuro",
    forkNoticePacket: "sha256:fork-notice-neuro",
  },
  reproducibility: {
    status: "passed",
    pipeline: "notebooks/run_analysis.ipynb",
    lastRunHash: "sha256:neuro-rerun",
  },
  metadata: {
    license: "CC-BY-4.0",
    datacite: "sha256:datacite-neuro",
    schemaOrg: "sha256:schema-neuro",
  },
};

const heldTransition = {
  ...readyTransition,
  repositoryId: "scibase/quantum-noise-draft",
  title: "Quantum Noise Draft",
  version: "0.8.0",
  action: "withdraw",
  reason: "A stale result figure was published before the rerun failure was explained.",
  snapshot: {
    hash: "sha256:quantum-080",
    currentHash: "sha256:quantum-081-drift",
    storageUri: "s3://scibase-archives/quantum-noise-draft/0.8.0.tar.gz",
    createdAt: "2026-05-09T12:00:00Z",
    mutable: false,
  },
  doi: {
    current: "10.5555/scibase.quantum-noise.v0.8.0",
    targetStatus: "deleted",
    dataciteRecord: "datacite:quantum-v080",
  },
  replacement: {},
  redirects: {
    doi: { destination: "deleted" },
    api: { destination: "tombstone", target: "/api/projects/quantum-noise-draft/versions/0.8.0/tombstone" },
  },
  provenance: {
    downstreamCitations: ["doi:10.4444/quantum.paper.42"],
    forks: ["scibase/quantum-noise-derived"],
  },
  reproducibility: {
    status: "failed",
    pipeline: "notebooks/noise_reduction.ipynb",
    lastRunHash: "sha256:failed-rerun",
  },
  metadata: {
    license: "CC-BY-NC-4.0",
    datacite: "sha256:datacite-quantum",
  },
};

const reports = [
  { name: "ready supersession", report: evaluateRepositoryTombstone(readyTransition) },
  { name: "held withdrawal", report: evaluateRepositoryTombstone(heldTransition) },
];

const jsonPath = path.join(outputDir, "repository-doi-tombstone-demo.json");
const markdownPath = path.join(outputDir, "repository-doi-tombstone-demo.md");

fs.writeFileSync(jsonPath, JSON.stringify(reports, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Repository DOI Tombstone Gate Demo",
    "",
    ...reports.flatMap(({ name, report }) => [
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
console.log(reports.map(({ name, report }) => `${name}: ${report.decision}`).join("\n"));
