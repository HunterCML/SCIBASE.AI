"use strict";

const crypto = require("crypto");

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stable(value[key]);
      return result;
    }, {});
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireField(record, field) {
  if (!record || record[field] === undefined || record[field] === null || record[field] === "") {
    throw new Error(`Missing required field: ${field}`);
  }
  return record[field];
}

function normalizeSection(section) {
  const id = String(requireField(section, "id"));
  return {
    id,
    title: section.title || id,
    text: section.text || "",
    revision: section.revision || 1,
    frozen: false,
    freeze: null,
    expectedExecutionHash: section.expectedExecutionHash || null,
    comments: [],
    suggestions: [],
    tasks: [],
    notebookOutputs: [],
    autosaves: []
  };
}

function createDocumentState(input) {
  const sections = {};
  for (const section of input.sections || []) {
    const normalized = normalizeSection(section);
    sections[normalized.id] = normalized;
  }

  return {
    documentId: String(requireField(input, "documentId")),
    version: input.version || "0.1.0",
    sections,
    operations: []
  };
}

function getSection(state, sectionId) {
  const section = state.sections[sectionId];
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }
  return section;
}

function appendOperation(state, operation) {
  state.operations.push({
    id: operation.id || `op-${state.operations.length + 1}`,
    type: operation.type,
    sectionId: operation.sectionId || null,
    actor: operation.actor || "anonymous"
  });
}

function autosaveSection(section, reason) {
  const snapshot = {
    reason,
    revision: section.revision,
    digest: digest({
      text: section.text,
      revision: section.revision,
      suggestions: section.suggestions,
      tasks: section.tasks,
      notebookOutputs: section.notebookOutputs
    })
  };
  section.autosaves.push(snapshot);
  return snapshot;
}

function assertCanDirectlyEdit(section, operation) {
  if (section.frozen && !operation.overrideFreeze) {
    throw new Error(`Section ${section.id} is frozen for review and cannot receive direct edits.`);
  }
}

function applyOperation(currentState, operation) {
  const state = clone(currentState);
  const type = requireField(operation, "type");
  const sectionId = operation.sectionId;

  if (type === "snapshot") {
    appendOperation(state, operation);
    return state;
  }

  const section = getSection(state, String(requireField(operation, "sectionId")));

  switch (type) {
    case "edit":
      assertCanDirectlyEdit(section, operation);
      section.text = String(requireField(operation, "text"));
      section.revision += 1;
      autosaveSection(section, "edit");
      break;

    case "setExpectedExecution":
      assertCanDirectlyEdit(section, operation);
      section.expectedExecutionHash = String(requireField(operation, "executionHash"));
      autosaveSection(section, "execution-target");
      break;

    case "notebookOutput":
      assertCanDirectlyEdit(section, operation);
      section.notebookOutputs.push({
        id: operation.id || `output-${section.notebookOutputs.length + 1}`,
        executionHash: String(requireField(operation, "executionHash")),
        sourceHash: operation.sourceHash || digest(section.text)
      });
      autosaveSection(section, "notebook-output");
      break;

    case "comment":
      section.comments.push({
        id: operation.id || `comment-${section.comments.length + 1}`,
        author: operation.actor || "reviewer",
        body: String(requireField(operation, "body")),
        blocking: operation.blocking === true,
        resolved: false
      });
      break;

    case "resolveComment":
      markById(section.comments, operation.commentId, "resolved", true);
      break;

    case "suggestion":
      section.suggestions.push({
        id: operation.id || `suggestion-${section.suggestions.length + 1}`,
        author: operation.actor || "reviewer",
        patch: String(requireField(operation, "patch")),
        blocking: operation.blocking === true,
        status: "open"
      });
      break;

    case "acceptSuggestion":
      assertCanDirectlyEdit(section, operation);
      markById(section.suggestions, operation.suggestionId, "status", "accepted");
      section.revision += 1;
      autosaveSection(section, "suggestion-accepted");
      break;

    case "declineSuggestion":
      markById(section.suggestions, operation.suggestionId, "status", "declined");
      break;

    case "task":
      section.tasks.push({
        id: operation.id || `task-${section.tasks.length + 1}`,
        title: String(requireField(operation, "title")),
        blocking: operation.blocking !== false,
        status: operation.status || "open"
      });
      break;

    case "completeTask":
      markById(section.tasks, operation.taskId, "status", "done");
      break;

    case "freeze":
      section.frozen = true;
      section.freeze = {
        reason: operation.reason || "review",
        reviewers: operation.reviewers || [],
        frozenRevision: section.revision,
        autosaveDigest: autosaveSection(section, "freeze").digest
      };
      break;

    case "unfreeze": {
      const readiness = evaluateFreezeReadiness(state, sectionId);
      if (!readiness.ready && !operation.overrideFreeze) {
        throw new Error(`Section ${section.id} cannot unfreeze: ${readiness.blockers.map((item) => item.code).join(", ")}`);
      }
      section.frozen = false;
      section.freeze = null;
      autosaveSection(section, "unfreeze");
      break;
    }

    default:
      throw new Error(`Unsupported operation: ${type}`);
  }

  appendOperation(state, operation);
  return state;
}

function markById(records, id, field, value) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    throw new Error(`Unknown record id: ${id}`);
  }
  record[field] = value;
}

function evaluateFreezeReadiness(state, sectionId) {
  const section = getSection(state, sectionId);
  const blockers = [];

  for (const comment of section.comments) {
    if (comment.blocking && !comment.resolved) {
      blockers.push({ code: "blocking_comment", id: comment.id, message: comment.body });
    }
  }

  for (const suggestion of section.suggestions) {
    if (suggestion.blocking && suggestion.status === "open") {
      blockers.push({ code: "open_blocking_suggestion", id: suggestion.id, message: suggestion.patch });
    }
  }

  for (const task of section.tasks) {
    if (task.blocking && task.status !== "done") {
      blockers.push({ code: "open_blocking_task", id: task.id, message: task.title });
    }
  }

  if (section.expectedExecutionHash) {
    const latestOutput = section.notebookOutputs[section.notebookOutputs.length - 1];
    if (!latestOutput || latestOutput.executionHash !== section.expectedExecutionHash) {
      blockers.push({
        code: "stale_notebook_output",
        id: section.id,
        message: "Notebook output does not match the expected execution hash."
      });
    }
  }

  return {
    ready: blockers.length === 0,
    sectionId,
    frozen: section.frozen,
    blockers,
    snapshotDigest: digest({
      text: section.text,
      revision: section.revision,
      comments: section.comments,
      suggestions: section.suggestions,
      tasks: section.tasks,
      notebookOutputs: section.notebookOutputs
    })
  };
}

function buildVersionSnapshot(state, label) {
  return {
    documentId: state.documentId,
    label,
    version: state.version,
    operationCount: state.operations.length,
    sectionDigests: Object.values(state.sections).map((section) => ({
      id: section.id,
      revision: section.revision,
      frozen: section.frozen,
      digest: digest({
        text: section.text,
        revision: section.revision,
        comments: section.comments,
        suggestions: section.suggestions,
        tasks: section.tasks,
        notebookOutputs: section.notebookOutputs
      })
    })).sort((a, b) => a.id.localeCompare(b.id)),
    snapshotDigest: digest(state)
  };
}

module.exports = {
  applyOperation,
  buildVersionSnapshot,
  createDocumentState,
  digest,
  evaluateFreezeReadiness
};

