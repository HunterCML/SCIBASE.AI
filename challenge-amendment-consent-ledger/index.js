"use strict";

const crypto = require("crypto");

function stableJson(value) {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = stableJson(value[key]);
        return sorted;
      }, {});
  }

  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableJson(value)))
    .digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function daysBetween(start, end) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.round((endTime - startTime) / 86400000);
}

function classifyAmendment(amendment, challenge) {
  const changes = amendment.changes || {};
  const materialChanges = [];
  let materialityScore = 0;

  if (asArray(changes.deliverablesAdded).length > 0) {
    materialChanges.push("deliverables_added");
    materialityScore += changes.deliverablesAdded.length * 20;
  }

  if (asArray(changes.evaluationCriteriaAdded).length > 0) {
    materialChanges.push("criteria_added");
    materialityScore += changes.evaluationCriteriaAdded.length * 16;
  }

  if (changes.rubricWeightDelta && Math.abs(changes.rubricWeightDelta) >= 10) {
    materialChanges.push("rubric_weight_shift");
    materialityScore += Math.min(30, Math.abs(changes.rubricWeightDelta));
  }

  if (changes.deadlineMovedTo) {
    const shiftDays = daysBetween(challenge.finalDeadline, changes.deadlineMovedTo);
    if (shiftDays < 0) {
      materialChanges.push("deadline_shortened");
      materialityScore += Math.min(25, Math.abs(shiftDays) * 3);
    }
  }

  if (changes.payoutSchedule && changes.payoutSchedule !== challenge.payoutSchedule) {
    materialChanges.push("payout_schedule_changed");
    materialityScore += 24;
  }

  if (changes.ipTerms && changes.ipTerms !== challenge.ipTerms) {
    materialChanges.push("ip_terms_changed");
    materialityScore += 30;
  }

  if (changes.privateDataRequired === true && challenge.privateDataRequired !== true) {
    materialChanges.push("private_data_added");
    materialityScore += 32;
  }

  const requiresReconsent = materialityScore >= 20;

  return {
    id: amendment.id,
    sponsorId: amendment.sponsorId,
    requestedAt: amendment.requestedAt,
    reason: amendment.reason || "not provided",
    materialChanges,
    materialityScore,
    requiresReconsent,
    digest: digest({
      challengeId: challenge.id,
      amendmentId: amendment.id,
      changes,
      requestedAt: amendment.requestedAt
    })
  };
}

function lockSubmissionEvidence(team, submissions, amendment) {
  const lockedSubmissions = submissions
    .filter((submission) => {
      return submission.teamId === team.teamId &&
        Date.parse(submission.submittedAt) <= Date.parse(amendment.requestedAt);
    })
    .map((submission) => ({
      id: submission.id,
      submittedAt: submission.submittedAt,
      artifactHashes: asArray(submission.artifactHashes).slice().sort(),
      manifestDigest: digest({
        id: submission.id,
        artifactHashes: asArray(submission.artifactHashes).slice().sort()
      })
    }));

  return {
    lockedCount: lockedSubmissions.length,
    lockedSubmissions,
    evidenceDigest: digest({
      teamId: team.teamId,
      amendmentId: amendment.id,
      lockedSubmissions
    })
  };
}

function evaluateTeamConsent({ team, amendment, submissions }) {
  const consentReceived = asArray(team.consentedAmendmentIds).includes(amendment.id);
  const evidenceLock = lockSubmissionEvidence(team, submissions, amendment);
  const consentRequired = amendment.requiresReconsent;
  const protectedWithdrawal =
    consentRequired &&
    !consentReceived &&
    evidenceLock.lockedCount > 0;

  return {
    teamId: team.teamId,
    amendmentId: amendment.id,
    consentRequired,
    consentReceived,
    protectedWithdrawal,
    payoutHold: consentRequired && !consentReceived,
    evidenceLock,
    status: consentRequired
      ? consentReceived
        ? "accepted_changed_terms"
        : protectedWithdrawal
          ? "protected_withdrawal_available"
          : "awaiting_consent"
      : "no_reconsent_required"
  };
}

function buildAmendmentLedger({ challenge, amendments, teams, submissions }) {
  if (!challenge || !challenge.id) {
    throw new Error("challenge.id is required");
  }

  const classifiedAmendments = asArray(amendments).map((amendment) =>
    classifyAmendment(amendment, challenge)
  );

  const teamStatuses = [];
  for (const amendment of classifiedAmendments) {
    for (const team of asArray(teams)) {
      teamStatuses.push(evaluateTeamConsent({
        team,
        amendment,
        submissions: asArray(submissions)
      }));
    }
  }

  const blockedAwardTeamIds = Array.from(new Set(
    teamStatuses
      .filter((status) => status.payoutHold)
      .map((status) => status.teamId)
  )).sort();

  const protectedWithdrawalTeamIds = Array.from(new Set(
    teamStatuses
      .filter((status) => status.protectedWithdrawal)
      .map((status) => status.teamId)
  )).sort();

  const safeToContinueTeamIds = asArray(teams)
    .map((team) => team.teamId)
    .filter((teamId) => !blockedAwardTeamIds.includes(teamId))
    .sort();

  return {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    classifiedAmendments,
    teamStatuses,
    arbitrationPacket: {
      challengeId: challenge.id,
      activeMaterialAmendmentIds: classifiedAmendments
        .filter((amendment) => amendment.requiresReconsent)
        .map((amendment) => amendment.id),
      blockedAwardTeamIds,
      protectedWithdrawalTeamIds,
      safeToContinueTeamIds,
      packetDigest: digest({
        challenge,
        classifiedAmendments,
        teamStatuses
      })
    }
  };
}

module.exports = {
  buildAmendmentLedger,
  classifyAmendment,
  digest,
  evaluateTeamConsent
};
