"use strict";

const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = {
  apiCredentialMaxAgeDays: 90,
  apiCredentialWarnDays: 14,
  inactiveCredentialMaxDays: 60,
  webhookSecretMaxAgeDays: 45,
  webhookSecretWarnDays: 7,
  maximumSecretOverlapHours: 48,
  requiredWebhookTransport: "https",
  minimumComplianceScore: 80,
};

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`);
  }
  return date;
}

function wholeDaysBetween(start, end) {
  return Math.floor((parseDate(end, "end") - parseDate(start, "start")) / DAY_MS);
}

function hoursBetween(start, end) {
  return Math.floor((parseDate(end, "end") - parseDate(start, "start")) / (60 * 60 * 1000));
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableDigest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function normalizeList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(Boolean).map(String).sort();
}

function compareScopes(grantedScopes, allowedScopes) {
  const granted = normalizeList(grantedScopes);
  const allowed = new Set(normalizeList(allowedScopes));
  return granted.filter((scope) => scope === "*" || !allowed.has(scope));
}

function severityFromScore(score) {
  if (score >= 80) {
    return "critical";
  }
  if (score >= 50) {
    return "high";
  }
  if (score >= 25) {
    return "medium";
  }
  return "low";
}

function sortByRisk(a, b) {
  if (b.riskScore !== a.riskScore) {
    return b.riskScore - a.riskScore;
  }
  return a.id.localeCompare(b.id);
}

function evaluateApiClient(client, now, policy) {
  const issues = [];
  const rotatedAgeDays = wholeDaysBetween(client.credentialLastRotatedAt, now);
  const inactiveDays = wholeDaysBetween(client.credentialLastUsedAt, now);
  const expiresInDays = wholeDaysBetween(now, client.expiresAt);
  const unauthorizedScopes = compareScopes(client.scopes, client.allowedScopes);

  let riskScore = 0;

  if (!client.owner || !client.owner.email) {
    issues.push("missing accountable owner");
    riskScore += 20;
  }

  if (rotatedAgeDays > policy.apiCredentialMaxAgeDays) {
    issues.push(`credential rotation overdue by ${rotatedAgeDays - policy.apiCredentialMaxAgeDays} days`);
    riskScore += 35;
  } else if (policy.apiCredentialMaxAgeDays - rotatedAgeDays <= policy.apiCredentialWarnDays) {
    issues.push("credential rotation due soon");
    riskScore += 12;
  }

  if (expiresInDays < 0) {
    issues.push(`credential expired ${Math.abs(expiresInDays)} days ago`);
    riskScore += 45;
  } else if (expiresInDays <= policy.apiCredentialWarnDays) {
    issues.push("credential expires within warning window");
    riskScore += 20;
  }

  if (inactiveDays > policy.inactiveCredentialMaxDays) {
    issues.push(`credential inactive for ${inactiveDays} days`);
    riskScore += 25;
  }

  if (unauthorizedScopes.length > 0) {
    issues.push(`unauthorized scopes: ${unauthorizedScopes.join(", ")}`);
    riskScore += unauthorizedScopes.includes("*") ? 45 : 30;
  }

  if (client.environment === "production" && client.hasBreakGlassAccess && !client.breakGlassJustification) {
    issues.push("production break-glass credential lacks justification");
    riskScore += 30;
  }

  const action =
    riskScore >= 80
      ? "suspend and rotate immediately"
      : riskScore >= 50
        ? "rotate before next export window"
        : riskScore >= 25
          ? "queue owner review"
          : "monitor";

  return {
    id: client.id,
    name: client.name,
    kind: "api-client",
    systems: normalizeList(client.systems),
    owner: client.owner || null,
    rotatedAgeDays,
    inactiveDays,
    expiresInDays,
    unauthorizedScopes,
    issues,
    riskScore,
    severity: severityFromScore(riskScore),
    action,
  };
}

function evaluateWebhook(webhook, now, policy) {
  const issues = [];
  const secretAgeDays = wholeDaysBetween(webhook.signingSecretLastRotatedAt, now);
  const overlapHours = webhook.activeSecretWindowStartedAt
    ? hoursBetween(webhook.activeSecretWindowStartedAt, now)
    : 0;

  let riskScore = 0;

  if (webhook.transport !== policy.requiredWebhookTransport) {
    issues.push(`non-compliant transport: ${webhook.transport || "missing"}`);
    riskScore += 40;
  }

  if (secretAgeDays > policy.webhookSecretMaxAgeDays) {
    issues.push(`webhook signing secret overdue by ${secretAgeDays - policy.webhookSecretMaxAgeDays} days`);
    riskScore += 35;
  } else if (policy.webhookSecretMaxAgeDays - secretAgeDays <= policy.webhookSecretWarnDays) {
    issues.push("webhook signing secret rotation due soon");
    riskScore += 12;
  }

  if (webhook.activeSecretCount > 1 && overlapHours > policy.maximumSecretOverlapHours) {
    issues.push(`secret overlap window exceeds ${policy.maximumSecretOverlapHours} hours`);
    riskScore += 35;
  }

  if (webhook.signatureAlgorithm !== "hmac-sha256") {
    issues.push("missing hmac-sha256 signature policy");
    riskScore += 30;
  }

  if (webhook.idempotencyKeyPolicy !== "required") {
    issues.push("idempotency key is not required");
    riskScore += 25;
  }

  if (!webhook.deadLetterQueue) {
    issues.push("missing dead-letter queue");
    riskScore += 20;
  }

  if (!webhook.recipientVerification) {
    issues.push("recipient endpoint is not verified");
    riskScore += 20;
  }

  const unsupportedEvents = compareScopes(webhook.eventTypes, webhook.allowedEventTypes);
  if (unsupportedEvents.length > 0) {
    issues.push(`unsupported event types: ${unsupportedEvents.join(", ")}`);
    riskScore += 25;
  }

  const action =
    riskScore >= 80
      ? "pause delivery and rotate secret"
      : riskScore >= 50
        ? "rotate secret and replay failed deliveries"
        : riskScore >= 25
          ? "queue integration owner review"
          : "monitor";

  return {
    id: webhook.id,
    name: webhook.name,
    kind: "webhook",
    systems: [webhook.destinationSystem].filter(Boolean),
    secretAgeDays,
    overlapHours,
    unsupportedEvents,
    issues,
    riskScore,
    severity: severityFromScore(riskScore),
    action,
  };
}

function buildDashboard(apiFindings, webhookFindings, policy) {
  const findings = [...apiFindings, ...webhookFindings].sort(sortByRisk);
  const highRiskCount = findings.filter((item) => item.riskScore >= 50).length;
  const criticalCount = findings.filter((item) => item.riskScore >= 80).length;
  const monitoredSystems = new Set(findings.flatMap((item) => item.systems));
  const maximumPenalty = findings.length * 100 || 1;
  const actualPenalty = findings.reduce((sum, item) => sum + Math.min(100, item.riskScore), 0);
  const complianceScore = Math.max(0, Math.round(100 - (actualPenalty / maximumPenalty) * 100));

  return {
    monitoredSystems: monitoredSystems.size,
    apiClients: apiFindings.length,
    webhookDestinations: webhookFindings.length,
    highRiskCount,
    criticalCount,
    complianceScore,
    belowPolicyFloor: complianceScore < policy.minimumComplianceScore,
    nextActions: findings.slice(0, 5).map((item) => ({
      id: item.id,
      severity: item.severity,
      action: item.action,
      issues: item.issues,
    })),
  };
}

function buildEvidencePacket(input, dashboard, findings, now) {
  const packet = {
    generatedAt: new Date(now).toISOString(),
    scope: "enterprise-api-webhook-secret-rotation",
    integrationCount: findings.length,
    complianceScore: dashboard.complianceScore,
    criticalCount: dashboard.criticalCount,
    highRiskCount: dashboard.highRiskCount,
    requirementCoverage: [
      "admin-dashboard-risk-queue",
      "secure-api-credential-governance",
      "webhook-secret-rotation",
      "institutional-integration-audit-export",
    ],
    findingDigest: stableDigest(findings.map((item) => ({
      id: item.id,
      issues: item.issues,
      riskScore: item.riskScore,
    }))),
    sourceDigest: stableDigest({
      apiClients: input.apiClients || [],
      webhooks: input.webhooks || [],
    }),
  };

  return {
    ...packet,
    packetDigest: stableDigest(packet),
  };
}

function evaluateEnterpriseIntegrationGovernance(input, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}), ...(options.policy || {}) };
  const now = options.now || input.generatedAt || new Date().toISOString();
  parseDate(now, "now");

  const apiFindings = (input.apiClients || []).map((client) => evaluateApiClient(client, now, policy));
  const webhookFindings = (input.webhooks || []).map((webhook) => evaluateWebhook(webhook, now, policy));
  const findings = [...apiFindings, ...webhookFindings].sort(sortByRisk);
  const dashboard = buildDashboard(apiFindings, webhookFindings, policy);
  const evidencePacket = buildEvidencePacket(input, dashboard, findings, now);

  return {
    generatedAt: new Date(now).toISOString(),
    policy,
    dashboard,
    findings,
    evidencePacket,
  };
}

module.exports = {
  DEFAULT_POLICY,
  evaluateEnterpriseIntegrationGovernance,
  evaluateApiClient,
  evaluateWebhook,
};
