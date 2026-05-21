const assert = require("assert");
const { evaluateNotebookKernelLeases } = require("./index");

function readyPacket(overrides = {}) {
  return {
    documentId: "doc-neuro-editor",
    projectId: "project-neuro",
    now: "2026-06-01T12:00:00Z",
    collaborators: [
      { id: "ada", role: "author" },
      { id: "lin", role: "reviewer" },
    ],
    kernels: [{ id: "kernel-python", language: "python", restartId: "restart-2", memoryGb: 5 }],
    leases: [
      {
        kernelId: "kernel-python",
        ownerId: "ada",
        expiresAt: "2026-06-01T13:00:00Z",
        memoryLimitGb: 8,
      },
    ],
    cells: [
      {
        id: "cell-1",
        kernelId: "kernel-python",
        releaseState: "draft",
        currentSourceHash: "sha256:source-1",
        lastExecutionHash: "sha256:source-1",
        outputKernelRestartId: "restart-2",
      },
    ],
    comments: [],
    ...overrides,
  };
}

function testReadyPacket() {
  const result = evaluateNotebookKernelLeases(readyPacket());
  assert.equal(result.decision, "ready-to-run");
  assert.equal(result.counts.blocker, 0);
  assert.equal(result.executionQueue.length, 1);
}

function testExpiredLeaseBlocksExecution() {
  const result = evaluateNotebookKernelLeases(
    readyPacket({
      leases: [{ kernelId: "kernel-python", ownerId: "ada", expiresAt: "2026-06-01T11:00:00Z", memoryLimitGb: 8 }],
    }),
  );

  assert.equal(result.decision, "hold-execution");
  assert.ok(result.findings.some((finding) => finding.code === "KERNEL_LEASE_EXPIRED"));
  assert.ok(result.findings.some((finding) => finding.code === "CELL_EXECUTION_BLOCKED_BY_LEASE"));
}

function testStaleOutputWarns() {
  const result = evaluateNotebookKernelLeases(
    readyPacket({
      cells: [
        {
          id: "cell-stale",
          kernelId: "kernel-python",
          releaseState: "draft",
          currentSourceHash: "sha256:source-1",
          lastExecutionHash: "sha256:source-1",
          outputKernelRestartId: "restart-1",
        },
      ],
    }),
  );

  assert.equal(result.decision, "queue-with-warnings");
  assert.ok(result.findings.some((finding) => finding.code === "CELL_OUTPUT_STALE_AFTER_RESTART"));
}

function testUnresolvedPublicationCommentBlocks() {
  const result = evaluateNotebookKernelLeases(
    readyPacket({
      cells: [
        {
          id: "cell-publication",
          kernelId: "kernel-python",
          releaseState: "publication-ready",
          currentSourceHash: "sha256:source-1",
          lastExecutionHash: "sha256:source-1",
          outputKernelRestartId: "restart-2",
        },
      ],
      comments: [{ id: "comment-1", cellId: "cell-publication", status: "open" }],
    }),
  );

  assert.equal(result.decision, "hold-execution");
  assert.ok(result.findings.some((finding) => finding.code === "PUBLICATION_CELL_HAS_UNRESOLVED_COMMENTS"));
}

function testDeterministicDigest() {
  const first = evaluateNotebookKernelLeases(readyPacket());
  const second = evaluateNotebookKernelLeases(readyPacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

testReadyPacket();
testExpiredLeaseBlocksExecution();
testStaleOutputWarns();
testUnresolvedPublicationCommentBlocks();
testDeterministicDigest();

console.log("notebook-kernel-lease-guard tests passed");
