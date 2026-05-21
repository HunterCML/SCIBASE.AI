const crypto = require("crypto");

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
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

function parseTime(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function addFinding(findings, severity, code, target, message, remediation) {
  findings.push({ severity, code, target, message, remediation });
}

function indexBy(items, key) {
  return asArray(items).reduce((acc, item) => {
    if (item && item[key]) acc[item[key]] = item;
    return acc;
  }, {});
}

function evaluateNotebookKernelLeases(packet) {
  const document = packet || {};
  const now = parseTime(document.now || new Date().toISOString());
  const cells = asArray(document.cells);
  const kernels = indexBy(document.kernels, "id");
  const leases = indexBy(document.leases, "kernelId");
  const comments = asArray(document.comments);
  const collaborators = indexBy(document.collaborators, "id");
  const findings = [];
  const executionQueue = [];

  if (!document.documentId || !document.projectId) {
    addFinding(
      findings,
      "blocker",
      "DOCUMENT_CONTEXT_MISSING",
      "document",
      "Document id and project id are required before kernel lease evaluation.",
      "Attach stable document and project ids so execution leases are audit-safe.",
    );
  }

  for (const kernel of asArray(document.kernels)) {
    const lease = leases[kernel.id];
    const target = `kernel:${kernel.id}`;
    if (!lease) {
      addFinding(
        findings,
        "blocker",
        "KERNEL_WITHOUT_LEASE",
        target,
        "A notebook kernel is available without an active lease record.",
        "Create an owner-scoped lease with expiry, handoff status, and resource limits before allowing execution.",
      );
      continue;
    }

    if (!collaborators[lease.ownerId]) {
      addFinding(
        findings,
        "blocker",
        "LEASE_OWNER_NOT_COLLABORATOR",
        target,
        `Kernel lease owner ${lease.ownerId} is not an active collaborator.`,
        "Release or transfer the lease to an active collaborator before execution.",
      );
    }

    if (parseTime(lease.expiresAt) <= now) {
      addFinding(
        findings,
        "blocker",
        "KERNEL_LEASE_EXPIRED",
        target,
        "Kernel lease has expired.",
        "Renew, transfer, or shut down the kernel before running more notebook cells.",
      );
    }

    if (lease.handoffRequestedBy && !lease.handoffAcceptedAt) {
      addFinding(
        findings,
        "warning",
        "KERNEL_HANDOFF_PENDING",
        target,
        "Kernel handoff is requested but not accepted.",
        "Pause execution until the new owner accepts the handoff and autosave snapshot.",
      );
    }

    if (kernel.memoryGb && lease.memoryLimitGb && kernel.memoryGb > lease.memoryLimitGb) {
      addFinding(
        findings,
        "warning",
        "KERNEL_MEMORY_LIMIT_EXCEEDED",
        target,
        "Kernel memory usage exceeds the lease limit.",
        "Queue execution or increase the approved resource lease before reruns.",
      );
    }
  }

  for (const cell of cells) {
    const kernel = kernels[cell.kernelId];
    const lease = leases[cell.kernelId];
    const target = `cell:${cell.id || "unknown"}`;

    if (!kernel) {
      addFinding(
        findings,
        "blocker",
        "CELL_KERNEL_MISSING",
        target,
        "Notebook cell references a missing kernel.",
        "Assign the cell to a valid project kernel before collaborative execution.",
      );
      continue;
    }

    if (!lease || parseTime(lease.expiresAt) <= now) {
      addFinding(
        findings,
        "blocker",
        "CELL_EXECUTION_BLOCKED_BY_LEASE",
        target,
        "Cell execution is blocked because its kernel lease is missing or expired.",
        "Renew the lease or queue the cell for a valid owner.",
      );
    }

    if (cell.outputKernelRestartId && cell.outputKernelRestartId !== kernel.restartId) {
      addFinding(
        findings,
        "warning",
        "CELL_OUTPUT_STALE_AFTER_RESTART",
        target,
        "Cell output was produced before the current kernel restart.",
        "Rerun the cell after the latest restart before freezing the manuscript.",
      );
    }

    if (cell.lastExecutionHash && cell.currentSourceHash && cell.lastExecutionHash !== cell.currentSourceHash) {
      addFinding(
        findings,
        "warning",
        "CELL_SOURCE_CHANGED_AFTER_OUTPUT",
        target,
        "Cell source changed after the last recorded output.",
        "Queue the cell for rerun and refresh linked manuscript outputs.",
      );
    }

    const unresolved = comments.filter((comment) => comment.cellId === cell.id && normalize(comment.status) !== "resolved");
    if (unresolved.length > 0 && normalize(cell.releaseState) === "publication-ready") {
      addFinding(
        findings,
        "blocker",
        "PUBLICATION_CELL_HAS_UNRESOLVED_COMMENTS",
        target,
        "Publication-ready notebook cell still has unresolved comments.",
        "Resolve inline reviewer comments or move the cell out of publication-ready state.",
      );
    }

    if (lease && parseTime(lease.expiresAt) > now && findings.every((finding) => finding.target !== target || finding.severity !== "blocker")) {
      executionQueue.push({
        cellId: cell.id,
        kernelId: cell.kernelId,
        ownerId: lease.ownerId,
        priority: normalize(cell.releaseState) === "publication-ready" ? "high" : "normal",
        queueDigest: digest({ cellId: cell.id, kernelId: cell.kernelId, ownerId: lease.ownerId, source: cell.currentSourceHash }),
      });
    }
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const packetOut = {
    documentId: document.documentId,
    decision: blockers.length > 0 ? "hold-execution" : warnings.length > 0 ? "queue-with-warnings" : "ready-to-run",
    counts: {
      blocker: blockers.length,
      warning: warnings.length,
      info: findings.filter((finding) => finding.severity === "info").length,
    },
    executionQueue,
    findings,
  };

  return {
    ...packetOut,
    auditDigest: digest(packetOut),
  };
}

module.exports = {
  evaluateNotebookKernelLeases,
  stableStringify,
};
