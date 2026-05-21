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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasAbsoluteLanguage(text) {
  return /\b(proves?|definitive|conclusive|always|never|guarantees?|eliminates?|fully explains?)\b/i.test(text || "");
}

function severityRank(severity) {
  return { blocker: 3, warning: 2, info: 1 }[severity] || 0;
}

function addFinding(findings, severity, code, claimId, message, remediation) {
  findings.push({ severity, code, claimId, message, remediation });
}

function evidenceScore(evidence) {
  const record = evidence || {};
  let score = 0;
  if (record.primaryData) score += 2;
  if (record.statisticalTest) score += 1;
  if (record.confidenceInterval) score += 1;
  if (record.effectSize !== undefined && record.effectSize !== null) score += 1;
  if (asArray(record.citations).length >= 2) score += 1;
  if (record.replication && normalize(record.replication.status) === "passed") score += 2;
  if (record.replication && normalize(record.replication.status) === "failed") score -= 3;
  if (record.replication && normalize(record.replication.status) === "non-deterministic") score -= 2;
  if (record.sampleSize && record.sampleSize >= 30) score += 1;
  return score;
}

function calibrateWording(claim, findings) {
  const text = claim.text || "";
  const maxSeverity = findings.reduce(
    (highest, finding) => (severityRank(finding.severity) > severityRank(highest) ? finding.severity : highest),
    "info",
  );

  if (maxSeverity === "blocker") {
    return text
      .replace(/\bproves?\b/gi, "suggests")
      .replace(/\bdefinitive(?:ly)?\b/gi, "preliminarily")
      .replace(/\bconclusive\b/gi, "provisional")
      .replace(/\beliminates?\b/gi, "reduces");
  }

  if (maxSeverity === "warning" && hasAbsoluteLanguage(text)) {
    return text.replace(/\b(always|never|guarantees?)\b/gi, "may");
  }

  return text;
}

function evaluateUncertaintyCalibration(packet) {
  const manuscript = packet || {};
  const claims = asArray(manuscript.claims);
  const findings = [];
  const calibratedClaims = [];

  if (!manuscript.manuscriptId || !manuscript.domain) {
    addFinding(
      findings,
      "blocker",
      "MANUSCRIPT_CONTEXT_MISSING",
      "manuscript",
      "Manuscript id and domain are required before adaptive review calibration can run.",
      "Attach manuscript identity and domain metadata so the assistant can select the correct review standard.",
    );
  }

  if (claims.length === 0) {
    addFinding(
      findings,
      "blocker",
      "NO_CLAIMS_TO_CALIBRATE",
      "manuscript",
      "No manuscript claims were provided for calibration.",
      "Extract claim statements from the draft before running the pre-submission assistant.",
    );
  }

  for (const claim of claims) {
    const claimFindings = [];
    const score = evidenceScore(claim.evidence);
    const evidence = claim.evidence || {};
    const requestedConfidence = normalize(claim.confidence || claim.strength);

    if (!claim.id || !claim.text) {
      addFinding(
        claimFindings,
        "blocker",
        "CLAIM_IDENTITY_MISSING",
        claim.id || "unknown",
        "Claim is missing an id or statement text.",
        "Store a stable claim id and the exact manuscript statement before generating review guidance.",
      );
    }

    if (hasAbsoluteLanguage(claim.text) && score < 5) {
      addFinding(
        claimFindings,
        "blocker",
        "ABSOLUTE_LANGUAGE_UNDER_SUPPORTED",
        claim.id,
        "The claim uses high-certainty language without enough evidence support.",
        "Replace absolute wording with calibrated language or attach stronger statistical, replication, and citation evidence.",
      );
    }

    if ((requestedConfidence === "high" || requestedConfidence === "definitive") && score < 5) {
      addFinding(
        claimFindings,
        "warning",
        "CONFIDENCE_EXCEEDS_EVIDENCE",
        claim.id,
        "Declared confidence is higher than the evidence packet supports.",
        "Lower the confidence rating or add primary data, confidence intervals, and replication evidence.",
      );
    }

    if (!evidence.confidenceInterval && (evidence.pValue !== undefined || evidence.effectSize !== undefined)) {
      addFinding(
        claimFindings,
        "warning",
        "UNCERTAINTY_INTERVAL_MISSING",
        claim.id,
        "Statistical evidence lacks a confidence or credible interval.",
        "Add interval estimates so reviewers can judge magnitude and uncertainty.",
      );
    }

    if (evidence.replication && normalize(evidence.replication.status) === "failed") {
      addFinding(
        claimFindings,
        "blocker",
        "FAILED_REPLICATION_OVERCLAIM",
        claim.id,
        "A failed replication is attached but the claim is still presented as stable.",
        "Route the claim through rebuttal, limitation, or research-gap framing before submission.",
      );
    }

    if (asArray(claim.limitations).length === 0 && score < 5) {
      addFinding(
        claimFindings,
        "warning",
        "LIMITATION_DISCLOSURE_MISSING",
        claim.id,
        "Under-supported claim has no limitation disclosure.",
        "Add a limitations sentence that explains sample, method, or reproducibility uncertainty.",
      );
    }

    findings.push(...claimFindings);
    calibratedClaims.push({
      id: claim.id,
      original: claim.text,
      calibrated: calibrateWording(claim, claimFindings),
      evidenceScore: score,
      confidence: score >= 6 ? "high" : score >= 3 ? "moderate" : "low",
      findingCodes: claimFindings.map((finding) => finding.code),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const reproducibilitySignals = claims.map((claim) => normalize(claim.evidence && claim.evidence.replication && claim.evidence.replication.status));
  const failedReplicationCount = reproducibilitySignals.filter((status) => status === "failed").length;
  const passedReplicationCount = reproducibilitySignals.filter((status) => status === "passed").length;

  const researchOpportunities = calibratedClaims
    .filter((claim) => claim.confidence === "low" || claim.findingCodes.includes("FAILED_REPLICATION_OVERCLAIM"))
    .map((claim) => ({
      claimId: claim.id,
      opportunity: "Run targeted replication or collect stronger primary evidence before making a high-certainty statement.",
      priority: claim.findingCodes.includes("FAILED_REPLICATION_OVERCLAIM") ? "high" : "medium",
    }));

  const reviewPacket = {
    decision: blockers.length > 0 ? "revise-before-submission" : warnings.length > 0 ? "calibrate-language" : "ready-for-review",
    manuscriptId: manuscript.manuscriptId,
    domain: manuscript.domain,
    counts: {
      blocker: blockers.length,
      warning: warnings.length,
      info: findings.filter((finding) => finding.severity === "info").length,
    },
    reproducibilityConfidence:
      failedReplicationCount > 0 ? "low" : passedReplicationCount >= Math.max(1, claims.length - 1) ? "high" : "moderate",
    calibratedClaims,
    findings,
    researchOpportunities,
  };

  return {
    ...reviewPacket,
    auditDigest: digest(reviewPacket),
  };
}

module.exports = {
  evaluateUncertaintyCalibration,
  evidenceScore,
  stableStringify,
};
