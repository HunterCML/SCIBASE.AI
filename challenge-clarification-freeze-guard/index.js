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

function isMaterialQuestion(question) {
  const tags = asArray(question.tags).map(normalize);
  return tags.some((tag) => ["deliverable", "rubric", "timeline", "payout", "ip", "nda", "data-access"].includes(tag));
}

function responseChangesRules(response) {
  const tags = asArray(response && response.changeTags).map(normalize);
  return tags.some((tag) => ["deliverable", "rubric", "timeline", "payout", "ip-policy", "eligibility"].includes(tag));
}

function evaluateChallengeClarificationFreeze(packet) {
  const challenge = packet || {};
  const questions = asArray(challenge.questions);
  const broadcasts = asArray(challenge.broadcasts);
  const teams = asArray(challenge.teams);
  const cutoff = parseTime(challenge.clarificationCutoff);
  const submissionDeadline = parseTime(challenge.submissionDeadline);
  const findings = [];
  const notificationPlan = [];

  if (!challenge.challengeId || !challenge.title) {
    addFinding(
      findings,
      "blocker",
      "CHALLENGE_CONTEXT_MISSING",
      "challenge",
      "Challenge id and title are required before clarification freeze.",
      "Attach stable challenge identity so Q&A decisions can be audited against the correct bounty.",
    );
  }

  if (!cutoff || !submissionDeadline) {
    addFinding(
      findings,
      "blocker",
      "FREEZE_TIMELINE_MISSING",
      "timeline",
      "Clarification cutoff and submission deadline are required.",
      "Publish a cutoff before solvers spend time under unstable requirements.",
    );
  }

  if (cutoff && submissionDeadline && cutoff >= submissionDeadline) {
    addFinding(
      findings,
      "blocker",
      "CUTOFF_AFTER_SUBMISSION_DEADLINE",
      "clarificationCutoff",
      "Clarification cutoff is not before the submission deadline.",
      "Move the clarification freeze earlier than the final submission deadline.",
    );
  }

  for (const question of questions) {
    const response = question.response || null;
    const material = isMaterialQuestion(question);
    const target = `question:${question.id || "unknown"}`;

    if (material && !response) {
      addFinding(
        findings,
        "blocker",
        "MATERIAL_QUESTION_UNANSWERED",
        target,
        `Material solver question is unanswered: ${question.text || question.id}`,
        "Answer material deliverable, rubric, timeline, payout, IP, NDA, or data-access questions before freezing the challenge.",
      );
    }

    if (response && cutoff && parseTime(response.createdAt) > cutoff && responseChangesRules(response)) {
      addFinding(
        findings,
        "blocker",
        "POST_CUTOFF_RULE_CHANGE",
        target,
        "Sponsor response after the clarification cutoff changes challenge rules.",
        "Convert the response into a formal amendment with solver re-consent and deadline extension.",
      );
    }

    if (response && responseChangesRules(response) && !response.amendmentId) {
      addFinding(
        findings,
        "warning",
        "RULE_CHANGE_NOT_AMENDED",
        target,
        "A clarification changes rules but is not linked to an amendment id.",
        "Link material rule changes to the amendment ledger so arbitration can distinguish clarification from scope expansion.",
      );
    }

    const requiredAudience = challenge.visibility === "private" ? teams.map((team) => team.id) : ["public"];
    const matchingBroadcast = broadcasts.find((broadcast) => broadcast.questionId === question.id);
    if (response && material && !matchingBroadcast) {
      addFinding(
        findings,
        "blocker",
        "MATERIAL_RESPONSE_NOT_BROADCAST",
        target,
        "Material clarification response was not broadcast to all eligible solvers.",
        "Broadcast the response to all eligible teams or the public Q&A digest before accepting submissions.",
      );
    }

    if (matchingBroadcast) {
      const recipients = asArray(matchingBroadcast.recipients);
      const missingRecipients = requiredAudience.filter((recipient) => !recipients.includes(recipient));
      if (missingRecipients.length > 0) {
        addFinding(
          findings,
          "warning",
          "BROADCAST_AUDIENCE_INCOMPLETE",
          target,
          `Clarification broadcast missed ${missingRecipients.length} eligible recipient(s).`,
          "Send the clarification to every eligible solver team and include it in the freeze digest.",
        );
      }

      notificationPlan.push({
        questionId: question.id,
        recipients,
        digest: digest({ questionId: question.id, response, recipients }),
      });
    }
  }

  const staleDigest = challenge.freezeDigest && challenge.freezeDigest.generatedAt && parseTime(challenge.freezeDigest.generatedAt) < Math.max(...questions.map((q) => parseTime(q.response && q.response.createdAt)), 0);
  if (!challenge.freezeDigest || !challenge.freezeDigest.hash) {
    addFinding(
      findings,
      "blocker",
      "FREEZE_DIGEST_MISSING",
      "freezeDigest",
      "Challenge lacks a final Q&A freeze digest.",
      "Generate a signed freeze digest containing every material question, response, broadcast audience, and amendment link.",
    );
  } else if (staleDigest) {
    addFinding(
      findings,
      "warning",
      "FREEZE_DIGEST_STALE",
      "freezeDigest",
      "Freeze digest predates one or more clarification responses.",
      "Regenerate the digest after the latest sponsor response.",
    );
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const packetOut = {
    challengeId: challenge.challengeId,
    decision: blockers.length > 0 ? "hold-submissions" : warnings.length > 0 ? "freeze-with-warnings" : "ready-to-freeze",
    counts: {
      blocker: blockers.length,
      warning: warnings.length,
      info: findings.filter((finding) => finding.severity === "info").length,
    },
    freezePacket: {
      clarificationCutoff: challenge.clarificationCutoff,
      submissionDeadline: challenge.submissionDeadline,
      materialQuestionCount: questions.filter(isMaterialQuestion).length,
      broadcastCount: broadcasts.length,
      notificationPlan,
    },
    findings,
  };

  return {
    ...packetOut,
    auditDigest: digest(packetOut),
  };
}

module.exports = {
  evaluateChallengeClarificationFreeze,
  isMaterialQuestion,
  responseChangesRules,
  stableStringify,
};
