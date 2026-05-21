const fs = require("fs");
const path = require("path");
const { evaluateChallengeClarificationFreeze } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const challenge = {
  challengeId: "challenge-climate-forecast-2026",
  title: "Regional climate forecasting model challenge",
  visibility: "private",
  clarificationCutoff: "2026-06-10T17:00:00Z",
  submissionDeadline: "2026-06-24T17:00:00Z",
  teams: [{ id: "solver-lab" }, { id: "student-team" }, { id: "industry-team" }],
  questions: [
    {
      id: "q-rubric",
      text: "Will reproducibility receive a separate score?",
      tags: ["rubric"],
      response: {
        createdAt: "2026-06-07T16:00:00Z",
        text: "Yes, reproducibility is a 20 point rubric category.",
        changeTags: ["rubric"],
        amendmentId: "amendment-02",
      },
    },
    {
      id: "q-data",
      text: "Can teams use sponsor-provided holdout regions for tuning?",
      tags: ["data-access"],
      response: {
        createdAt: "2026-06-11T09:00:00Z",
        text: "No, holdout regions may only be used for final scoring.",
        changeTags: [],
      },
    },
  ],
  broadcasts: [
    { questionId: "q-rubric", recipients: ["solver-lab", "student-team"], sentAt: "2026-06-07T16:05:00Z" },
  ],
  freezeDigest: {
    hash: "sha256:old-digest",
    generatedAt: "2026-06-08T10:00:00Z",
  },
};

const report = evaluateChallengeClarificationFreeze(challenge);
const jsonPath = path.join(outputDir, "challenge-clarification-freeze-report.json");
const markdownPath = path.join(outputDir, "challenge-clarification-freeze-report.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Challenge Clarification Freeze Guard Demo",
    "",
    `Decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    `Material questions: ${report.freezePacket.materialQuestionCount}`,
    "",
    "## Findings",
    "",
    ...report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}`),
    "",
    "## Notification Plan",
    "",
    ...report.freezePacket.notificationPlan.map((item) => `- ${item.questionId}: ${item.recipients.join(", ")} (${item.digest})`),
    "",
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`${report.decision}: ${report.findings.length} finding(s), ${report.auditDigest}`);
