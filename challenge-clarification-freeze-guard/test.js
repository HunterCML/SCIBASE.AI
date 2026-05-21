const assert = require("assert");
const { evaluateChallengeClarificationFreeze, isMaterialQuestion } = require("./index");

function readyPacket(overrides = {}) {
  return {
    challengeId: "challenge-biomarker-2026",
    title: "Identify biomarker candidates from single-cell RNA-seq",
    visibility: "private",
    clarificationCutoff: "2026-06-10T17:00:00Z",
    submissionDeadline: "2026-06-24T17:00:00Z",
    teams: [{ id: "team-a" }, { id: "team-b" }],
    questions: [
      {
        id: "q1",
        text: "Does the final deliverable require a trained model or a reproducible notebook?",
        tags: ["deliverable"],
        response: {
          createdAt: "2026-06-04T14:00:00Z",
          text: "A reproducible notebook plus candidate ranking table is required.",
          changeTags: [],
        },
      },
      {
        id: "q2",
        text: "Can teams cite sponsor-provided raw counts?",
        tags: ["data-access"],
        response: {
          createdAt: "2026-06-05T11:00:00Z",
          text: "Yes, but raw counts must stay inside the private workspace.",
          changeTags: [],
        },
      },
    ],
    broadcasts: [
      { questionId: "q1", recipients: ["team-a", "team-b"], sentAt: "2026-06-04T14:05:00Z" },
      { questionId: "q2", recipients: ["team-a", "team-b"], sentAt: "2026-06-05T11:05:00Z" },
    ],
    freezeDigest: {
      hash: "sha256:freeze-digest",
      generatedAt: "2026-06-10T17:01:00Z",
    },
    ...overrides,
  };
}

function testReadyPacket() {
  const result = evaluateChallengeClarificationFreeze(readyPacket());
  assert.equal(result.decision, "ready-to-freeze");
  assert.equal(result.counts.blocker, 0);
  assert.equal(result.freezePacket.materialQuestionCount, 2);
}

function testMaterialQuestionNeedsAnswer() {
  const result = evaluateChallengeClarificationFreeze(
    readyPacket({
      questions: [
        {
          id: "q-material",
          text: "Will the scoring rubric weight reproducibility?",
          tags: ["rubric"],
        },
      ],
      broadcasts: [],
    }),
  );

  assert.equal(result.decision, "hold-submissions");
  assert.ok(result.findings.some((finding) => finding.code === "MATERIAL_QUESTION_UNANSWERED"));
}

function testPostCutoffRuleChangeRequiresAmendment() {
  const result = evaluateChallengeClarificationFreeze(
    readyPacket({
      questions: [
        {
          id: "q-late",
          text: "Can the sponsor change payout milestones?",
          tags: ["payout"],
          response: {
            createdAt: "2026-06-11T12:00:00Z",
            text: "The sponsor now requires a third milestone.",
            changeTags: ["payout"],
          },
        },
      ],
      broadcasts: [{ questionId: "q-late", recipients: ["team-a", "team-b"], sentAt: "2026-06-11T12:10:00Z" }],
    }),
  );

  assert.equal(result.decision, "hold-submissions");
  assert.ok(result.findings.some((finding) => finding.code === "POST_CUTOFF_RULE_CHANGE"));
}

function testMissingBroadcastBlocks() {
  const result = evaluateChallengeClarificationFreeze(
    readyPacket({
      questions: [
        {
          id: "q-private",
          text: "Does the NDA allow external contractors?",
          tags: ["nda"],
          response: {
            createdAt: "2026-06-02T12:00:00Z",
            text: "No external contractors are allowed.",
            changeTags: [],
          },
        },
      ],
      broadcasts: [],
    }),
  );

  assert.equal(result.decision, "hold-submissions");
  assert.ok(result.findings.some((finding) => finding.code === "MATERIAL_RESPONSE_NOT_BROADCAST"));
}

function testDeterministicDigest() {
  const first = evaluateChallengeClarificationFreeze(readyPacket());
  const second = evaluateChallengeClarificationFreeze(readyPacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

assert.equal(isMaterialQuestion({ tags: ["deliverable"] }), true);
testReadyPacket();
testMaterialQuestionNeedsAnswer();
testPostCutoffRuleChangeRequiresAmendment();
testMissingBroadcastBlocks();
testDeterministicDigest();

console.log("challenge-clarification-freeze-guard tests passed");
