"use strict";

const assert = require("assert");
const {
  applyOperation,
  buildVersionSnapshot,
  createDocumentState,
  evaluateFreezeReadiness
} = require("./index");

let state = createDocumentState({
  documentId: "paper-42",
  version: "0.7.0",
  sections: [
    { id: "methods", title: "Methods", text: "Original methods" },
    { id: "results", title: "Results", text: "Original results" }
  ]
});

state = applyOperation(state, {
  type: "edit",
  sectionId: "methods",
  actor: "author-a",
  text: "Methods with new model"
});

state = applyOperation(state, {
  type: "setExpectedExecution",
  sectionId: "methods",
  executionHash: "notebook-hash-v2"
});

state = applyOperation(state, {
  type: "notebookOutput",
  sectionId: "methods",
  executionHash: "notebook-hash-v1"
});

state = applyOperation(state, {
  type: "freeze",
  sectionId: "methods",
  reason: "pre-submission review",
  reviewers: ["stat-reviewer", "domain-reviewer"]
});

assert.throws(() => applyOperation(state, {
  type: "edit",
  sectionId: "methods",
  text: "Sneak in a direct edit"
}), /frozen for review/);

state = applyOperation(state, {
  type: "comment",
  sectionId: "methods",
  id: "c1",
  actor: "stat-reviewer",
  body: "Explain the bootstrap interval.",
  blocking: true
});

state = applyOperation(state, {
  type: "task",
  sectionId: "methods",
  id: "t1",
  title: "Attach reproducibility bundle.",
  blocking: true
});

state = applyOperation(state, {
  type: "suggestion",
  sectionId: "methods",
  id: "s1",
  actor: "domain-reviewer",
  patch: "Clarify sample exclusion criteria.",
  blocking: true
});

let readiness = evaluateFreezeReadiness(state, "methods");
assert.strictEqual(readiness.ready, false);
assert.deepStrictEqual(readiness.blockers.map((item) => item.code).sort(), [
  "blocking_comment",
  "open_blocking_suggestion",
  "open_blocking_task",
  "stale_notebook_output"
]);

state = applyOperation(state, { type: "resolveComment", sectionId: "methods", commentId: "c1" });
state = applyOperation(state, { type: "completeTask", sectionId: "methods", taskId: "t1" });
state = applyOperation(state, { type: "declineSuggestion", sectionId: "methods", suggestionId: "s1" });

state = applyOperation(state, {
  type: "notebookOutput",
  sectionId: "methods",
  executionHash: "notebook-hash-v2",
  overrideFreeze: true
});

readiness = evaluateFreezeReadiness(state, "methods");
assert.strictEqual(readiness.ready, true);

state = applyOperation(state, { type: "unfreeze", sectionId: "methods" });
assert.strictEqual(state.sections.methods.frozen, false);

const snapshot = buildVersionSnapshot(state, "ready-for-submission");
assert.strictEqual(snapshot.documentId, "paper-42");
assert.strictEqual(snapshot.sectionDigests.length, 2);
assert.ok(snapshot.snapshotDigest.length > 20);

console.log("collab-review-freeze-lane tests passed");

