const assert = require("assert");
const { evaluateRepositoryTombstone } = require("./index");

function readyPacket(overrides = {}) {
  return {
    repositoryId: "scibase/project-alpha",
    repositoryUrl: "https://scibase.ai/projects/project-alpha",
    title: "Project Alpha Repository",
    version: "2.1.0",
    action: "supersede",
    reason: "Version 2.1.0 contains stale protocol metadata; 2.1.1 is the corrected release.",
    publisher: "SCIBASE.AI",
    publicationYear: 2026,
    snapshot: {
      hash: "sha256:project-alpha-210",
      currentHash: "sha256:project-alpha-210",
      storageUri: "s3://scibase-archives/project-alpha/2.1.0.tar.gz",
      createdAt: "2026-05-01T10:00:00Z",
      mutable: false,
    },
    doi: {
      current: "10.5555/scibase.project-alpha.v2.1.0",
      targetStatus: "tombstone-with-replacement",
      dataciteRecord: "datacite-record-210",
    },
    replacement: {
      version: "2.1.1",
      doi: "10.5555/scibase.project-alpha.v2.1.1",
      snapshotHash: "sha256:project-alpha-211",
    },
    redirects: {
      doi: { destination: "replacement", target: "10.5555/scibase.project-alpha.v2.1.1" },
      api: { destination: "tombstone", target: "/api/projects/project-alpha/versions/2.1.0/tombstone" },
      exportBundle: { destination: "archive", target: "s3://scibase-archives/project-alpha/2.1.0.tar.gz" },
      citationBadge: { destination: "replacement", target: "10.5555/scibase.project-alpha.v2.1.1" },
    },
    provenance: {
      downstreamCitations: ["doi:10.4444/example.paper.12"],
      forks: ["scibase/project-alpha-derivative"],
      citationNoticePacket: "sha256:citation-notice",
      forkNoticePacket: "sha256:fork-notice",
    },
    reproducibility: {
      status: "passed",
      pipeline: "run_analysis.ipynb",
      lastRunHash: "sha256:repro-run",
    },
    metadata: {
      license: "CC-BY-4.0",
      datacite: "sha256:datacite-packet",
      schemaOrg: "sha256:schema-packet",
    },
    ...overrides,
  };
}

function testReadyPacket() {
  const result = evaluateRepositoryTombstone(readyPacket());
  assert.equal(result.decision, "ready");
  assert.equal(result.counts.blocker, 0);
  assert.equal(result.datacite.identifier, "10.5555/scibase.project-alpha.v2.1.0");
  assert.equal(result.schemaOrg.creativeWorkStatus, "supersede");
}

function testMissingSnapshotBlocksTransition() {
  const result = evaluateRepositoryTombstone(readyPacket({ snapshot: { mutable: true } }));
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "IMMUTABLE_SNAPSHOT_MISSING"));
  assert.ok(result.findings.some((finding) => finding.code === "SNAPSHOT_NOT_IMMUTABLE"));
}

function testSupersessionRequiresReplacement() {
  const result = evaluateRepositoryTombstone(readyPacket({ replacement: {} }));
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "SUPERSESSION_TARGET_MISSING"));
}

function testCitationNoticeRequired() {
  const packet = readyPacket({
    provenance: {
      downstreamCitations: ["doi:10.4444/example.paper.12"],
      forks: ["scibase/project-alpha-derivative"],
      forkNoticePacket: "sha256:fork-notice",
    },
  });

  const result = evaluateRepositoryTombstone(packet);
  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "DOWNSTREAM_CITATION_NOTICE_MISSING"));
}

function testSnapshotHashDriftBlocks() {
  const result = evaluateRepositoryTombstone(
    readyPacket({
      snapshot: {
        hash: "sha256:archived",
        currentHash: "sha256:changed",
        storageUri: "s3://scibase-archives/project-alpha/2.1.0.tar.gz",
        createdAt: "2026-05-01T10:00:00Z",
        mutable: false,
      },
    }),
  );

  assert.equal(result.decision, "hold");
  assert.ok(result.findings.some((finding) => finding.code === "SNAPSHOT_HASH_DRIFT"));
}

function testDeterministicDigest() {
  const first = evaluateRepositoryTombstone(readyPacket());
  const second = evaluateRepositoryTombstone(readyPacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

testReadyPacket();
testMissingSnapshotBlocksTransition();
testSupersessionRequiresReplacement();
testCitationNoticeRequired();
testSnapshotHashDriftBlocks();
testDeterministicDigest();

console.log("repository-doi-tombstone-gate tests passed");
