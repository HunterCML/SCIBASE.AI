const crypto = require("crypto");

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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

function parseDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

function unique(values) {
  return [...new Set(asArray(values).map(normalize).filter(Boolean))];
}

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

function daysBetween(start, end) {
  if (!start || !end) return Infinity;
  return Math.floor(Math.abs(end - start) / 86400000);
}

function evidenceMatches(evidence, kind, value) {
  const target = normalize(value);
  return asArray(evidence).filter((item) => {
    if (kind && normalize(item.type) !== normalize(kind)) return false;
    const domains = unique(item.domains || item.domain);
    const methods = unique(item.methods || item.method);
    const topics = unique(item.topics || item.topic);
    return domains.includes(target) || methods.includes(target) || topics.includes(target);
  });
}

function hasConflict(reviewer, assignment) {
  const projectId = normalize(assignment.projectId || assignment.manuscriptId);
  const authorIds = unique(assignment.authorIds);
  const institutions = unique(assignment.institutions);
  const funders = unique(assignment.funders);
  const reviewerInstitution = normalize(reviewer.institution);

  for (const conflict of asArray(reviewer.conflicts)) {
    const conflictProject = normalize(conflict.projectId || conflict.manuscriptId);
    if (conflictProject && conflictProject === projectId) return conflict.type || "project";
    if (authorIds.includes(normalize(conflict.authorId))) return conflict.type || "author";
    if (funders.includes(normalize(conflict.funder))) return conflict.type || "funder";
  }

  if (reviewerInstitution && institutions.includes(reviewerInstitution)) {
    return "shared-institution";
  }

  return "";
}

function newestEvidenceAgeDays(matches, now) {
  if (matches.length === 0) return Infinity;
  const newest = matches
    .map((item) => parseDate(item.issuedAt || item.updatedAt || item.createdAt))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  return daysBetween(newest, now);
}

function publicReviewerProfile(reviewer, assignment, score, badge) {
  const expertiseTags = unique([
    ...asArray(reviewer.declaredDomains),
    ...asArray(reviewer.declaredMethods),
    ...asArray(reviewer.methods),
  ]).slice(0, 8);

  if (assignment.anonymousMode) {
    return {
      reviewerHash: digest({ reviewerId: reviewer.id, manuscriptId: assignment.manuscriptId }).slice(0, 16),
      expertiseTags,
      expertiseScore: score,
      badge,
      identityRedacted: true,
    };
  }

  return {
    reviewerId: reviewer.id,
    displayName: reviewer.displayName || reviewer.id,
    orcid: reviewer.orcid,
    expertiseTags,
    expertiseScore: score,
    badge,
    identityRedacted: false,
  };
}

function evaluateAssignment(assignment, reviewersById, context) {
  const reviewer = reviewersById[assignment.reviewerId] || {};
  const findings = [];
  const requiredDomains = unique(assignment.requiredDomains);
  const requiredMethods = unique(assignment.requiredMethods);
  const declaredDomains = unique(reviewer.declaredDomains);
  const declaredMethods = unique(reviewer.declaredMethods || reviewer.methods);
  const evidence = asArray(reviewer.evidence);
  const maxEvidenceAgeDays = Number(assignment.maxEvidenceAgeDays || context.maxEvidenceAgeDays || 730);
  let score = 100;

  if (!assignment.manuscriptId || !assignment.reviewerId) {
    addFinding(
      findings,
      "blocker",
      "ASSIGNMENT_CONTEXT_MISSING",
      "Reviewer assignment must include a manuscript id and reviewer id.",
      "Attach stable assignment context before weighting a review or awarding expertise reputation.",
    );
    score -= 40;
  }

  if (!reviewer.id) {
    addFinding(
      findings,
      "blocker",
      "REVIEWER_PROFILE_MISSING",
      "The assignment references a reviewer profile that is not present in the packet.",
      "Load the reviewer profile and expertise evidence before assignment.",
    );
    score -= 40;
  }

  const conflictType = hasConflict(reviewer, assignment);
  if (conflictType) {
    addFinding(
      findings,
      "blocker",
      "REVIEWER_CONFLICT_DETECTED",
      `Reviewer has a ${conflictType} conflict with this manuscript.`,
      "Block weighted review credit until a steward resolves or reassigns the review.",
    );
    score -= 45;
  }

  for (const domain of requiredDomains) {
    const matches = evidenceMatches(evidence, "domain", domain);
    if (!declaredDomains.includes(domain)) {
      addFinding(
        findings,
        "warning",
        "DOMAIN_NOT_DECLARED",
        `Reviewer has not declared the required domain ${domain}.`,
        "Ask the reviewer to update profile expertise or route to a better matched reviewer.",
      );
      score -= 10;
    }
    if (matches.length === 0) {
      addFinding(
        findings,
        "warning",
        "DOMAIN_EVIDENCE_MISSING",
        `Reviewer lacks evidence for required domain ${domain}.`,
        "Attach publication, ORCID, grant, or verified review evidence before awarding a trusted reviewer badge.",
      );
      score -= 16;
    } else if (newestEvidenceAgeDays(matches, context.now) > maxEvidenceAgeDays) {
      addFinding(
        findings,
        "warning",
        "DOMAIN_EVIDENCE_STALE",
        `Reviewer evidence for ${domain} is older than ${maxEvidenceAgeDays} days.`,
        "Refresh the credential evidence before using it for weighted reputation.",
      );
      score -= 8;
    }
  }

  for (const method of requiredMethods) {
    const matches = evidenceMatches(evidence, "method", method);
    if (!declaredMethods.includes(method) || matches.length === 0) {
      addFinding(
        findings,
        "warning",
        "METHOD_EVIDENCE_GAP",
        `Reviewer does not have current evidence for required method ${method}.`,
        "Lower review weight or request a second reviewer with method-specific credentials.",
      );
      score -= 12;
    }
  }

  const acceptedReviews = Number(reviewer.acceptedReviews || 0);
  if (acceptedReviews < Number(context.minimumAcceptedReviews || 3)) {
    addFinding(
      findings,
      "info",
      "REVIEW_HISTORY_LIGHT",
      "Reviewer has a short accepted-review history for trusted badge elevation.",
      "Use steward review before granting a persistent expertise badge.",
    );
    score -= 5;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const badge =
    blockers.length > 0
      ? "badge-blocked"
      : warnings.length > 0 || normalizedScore < 85
        ? "steward-review"
        : "trusted-reviewer-eligible";
  const decision =
    blockers.length > 0
      ? "block-assignment"
      : warnings.length > 0
        ? "assign-with-lower-weight"
        : "trusted-reviewer-ready";
  const weight = blockers.length > 0 ? 0 : Number((normalizedScore / 100).toFixed(2));

  const result = {
    assignmentId: assignment.id || `${assignment.manuscriptId}:${assignment.reviewerId}`,
    manuscriptId: assignment.manuscriptId,
    reviewerId: reviewer.id || assignment.reviewerId,
    decision,
    badge,
    expertiseScore: normalizedScore,
    reviewWeight: weight,
    requiredDomains,
    requiredMethods,
    findings,
    publicProfile: publicReviewerProfile(reviewer, assignment, normalizedScore, badge),
  };

  return {
    ...result,
    assignmentDigest: digest(result),
  };
}

function evaluateReviewerExpertiseCredentials(packet = {}) {
  const reviewersById = asArray(packet.reviewers).reduce((acc, reviewer) => {
    if (reviewer && reviewer.id) acc[reviewer.id] = reviewer;
    return acc;
  }, {});
  const context = {
    now: parseDate(packet.now || new Date().toISOString()),
    maxEvidenceAgeDays: packet.maxEvidenceAgeDays || 730,
    minimumAcceptedReviews: packet.minimumAcceptedReviews || 3,
  };
  const assignments = asArray(packet.assignments).map((assignment) => evaluateAssignment(assignment, reviewersById, context));
  const counts = assignments.reduce(
    (acc, assignment) => {
      acc[assignment.decision] = (acc[assignment.decision] || 0) + 1;
      acc.findings += assignment.findings.length;
      return acc;
    },
    { "trusted-reviewer-ready": 0, "assign-with-lower-weight": 0, "block-assignment": 0, findings: 0 },
  );
  const report = {
    generatedAt: packet.now || new Date().toISOString(),
    decision: counts["block-assignment"] > 0 ? "steward-intervention-required" : counts["assign-with-lower-weight"] > 0 ? "credential-review-needed" : "expertise-routing-ready",
    counts,
    assignments,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

module.exports = {
  evaluateReviewerExpertiseCredentials,
  stableStringify,
};
