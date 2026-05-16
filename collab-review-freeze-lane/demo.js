"use strict";

const {
  applyOperation,
  buildVersionSnapshot,
  createDocumentState,
  evaluateFreezeReadiness
} = require("./index");

let state = createDocumentState({
  documentId: "neuroscience-manuscript",
  version: "1.2.0",
  sections: [
    { id: "abstract", text: "Concise result summary." },
    { id: "analysis", text: "Notebook-backed analysis narrative." }
  ]
});

state = applyOperation(state, { type: "setExpectedExecution", sectionId: "analysis", executionHash: "exec-2026-05-16" });
state = applyOperation(state, { type: "freeze", sectionId: "analysis", reason: "journal submission gate", reviewers: ["methods", "editorial"] });
state = applyOperation(state, { type: "comment", sectionId: "analysis", id: "review-1", body: "Confirm the rerun uses the final cohort.", blocking: true });
state = applyOperation(state, { type: "task", sectionId: "analysis", id: "task-1", title: "Upload notebook execution bundle.", blocking: true });

const blocked = evaluateFreezeReadiness(state, "analysis");

state = applyOperation(state, { type: "resolveComment", sectionId: "analysis", commentId: "review-1" });
state = applyOperation(state, { type: "completeTask", sectionId: "analysis", taskId: "task-1" });
state = applyOperation(state, { type: "notebookOutput", sectionId: "analysis", executionHash: "exec-2026-05-16", overrideFreeze: true });

const ready = evaluateFreezeReadiness(state, "analysis");
const snapshot = buildVersionSnapshot(state, "analysis-section-ready");

console.log(JSON.stringify({
  beforeClearance: blocked,
  afterClearance: ready,
  snapshot
}, null, 2));

