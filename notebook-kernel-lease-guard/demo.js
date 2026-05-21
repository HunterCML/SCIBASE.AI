const fs = require("fs");
const path = require("path");
const { evaluateNotebookKernelLeases } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const document = {
  documentId: "doc-materials-manuscript",
  projectId: "project-materials",
  now: "2026-06-01T12:00:00Z",
  collaborators: [
    { id: "ada", role: "author" },
    { id: "lin", role: "reviewer" },
  ],
  kernels: [
    { id: "python-main", language: "python", restartId: "restart-5", memoryGb: 11 },
    { id: "r-stats", language: "r", restartId: "restart-1", memoryGb: 3 },
  ],
  leases: [
    {
      kernelId: "python-main",
      ownerId: "ada",
      expiresAt: "2026-06-01T13:00:00Z",
      memoryLimitGb: 8,
      handoffRequestedBy: "lin",
    },
    {
      kernelId: "r-stats",
      ownerId: "lin",
      expiresAt: "2026-06-01T11:30:00Z",
      memoryLimitGb: 6,
    },
  ],
  cells: [
    {
      id: "cell-model-fit",
      kernelId: "python-main",
      releaseState: "publication-ready",
      currentSourceHash: "sha256:model-fit-v2",
      lastExecutionHash: "sha256:model-fit-v1",
      outputKernelRestartId: "restart-4",
    },
    {
      id: "cell-stat-table",
      kernelId: "r-stats",
      releaseState: "publication-ready",
      currentSourceHash: "sha256:stat-table",
      lastExecutionHash: "sha256:stat-table",
      outputKernelRestartId: "restart-1",
    },
  ],
  comments: [{ id: "comment-7", cellId: "cell-model-fit", status: "open" }],
};

const report = evaluateNotebookKernelLeases(document);
const jsonPath = path.join(outputDir, "notebook-kernel-lease-report.json");
const markdownPath = path.join(outputDir, "notebook-kernel-lease-report.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Notebook Kernel Lease Guard Demo",
    "",
    `Decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Findings",
    "",
    ...report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}`),
    "",
    "## Execution Queue",
    "",
    ...report.executionQueue.map((item) => `- ${item.cellId} on ${item.kernelId} for ${item.ownerId} (${item.priority})`),
    "",
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`${report.decision}: ${report.findings.length} finding(s), ${report.auditDigest}`);
