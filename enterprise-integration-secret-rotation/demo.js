"use strict";

const { evaluateEnterpriseIntegrationGovernance } = require("./index");

const input = {
  generatedAt: "2026-05-17T01:25:00.000Z",
  apiClients: [
    {
      id: "api-dspace-prod",
      name: "DSpace institutional archive sync",
      systems: ["DSpace", "ORCID"],
      environment: "production",
      scopes: ["repository:read", "publication:write", "admin:*"],
      allowedScopes: ["repository:read", "publication:write"],
      owner: { name: "Research IT", email: "research-it@example.edu" },
      credentialLastRotatedAt: "2026-01-01T00:00:00.000Z",
      credentialLastUsedAt: "2026-05-16T10:00:00.000Z",
      expiresAt: "2026-05-10T00:00:00.000Z",
      hasBreakGlassAccess: true,
    },
    {
      id: "api-orcid-prod",
      name: "ORCID affiliation updater",
      systems: ["ORCID", "HRIS"],
      environment: "production",
      scopes: ["person:read", "affiliation:write"],
      allowedScopes: ["person:read", "affiliation:write"],
      owner: { name: "Identity Team", email: "identity@example.edu" },
      credentialLastRotatedAt: "2026-04-28T00:00:00.000Z",
      credentialLastUsedAt: "2026-05-16T09:30:00.000Z",
      expiresAt: "2026-10-01T00:00:00.000Z",
      hasBreakGlassAccess: false,
    },
  ],
  webhooks: [
    {
      id: "hook-eln-publication",
      name: "ELN publication webhook",
      destinationSystem: "Benchling ELN",
      eventTypes: ["project.published", "review.completed"],
      allowedEventTypes: ["project.published", "review.completed"],
      transport: "https",
      signatureAlgorithm: "hmac-sha256",
      signingSecretLastRotatedAt: "2026-03-01T00:00:00.000Z",
      activeSecretCount: 2,
      activeSecretWindowStartedAt: "2026-05-13T00:00:00.000Z",
      idempotencyKeyPolicy: "optional",
      deadLetterQueue: false,
      recipientVerification: true,
    },
    {
      id: "hook-funder-report",
      name: "Funder compliance report webhook",
      destinationSystem: "NIH RePORTER",
      eventTypes: ["export.ready"],
      allowedEventTypes: ["export.ready"],
      transport: "https",
      signatureAlgorithm: "hmac-sha256",
      signingSecretLastRotatedAt: "2026-05-05T00:00:00.000Z",
      activeSecretCount: 1,
      idempotencyKeyPolicy: "required",
      deadLetterQueue: true,
      recipientVerification: true,
    },
  ],
};

const result = evaluateEnterpriseIntegrationGovernance(input);

console.log(JSON.stringify({
  dashboard: result.dashboard,
  topFindings: result.findings.slice(0, 3).map((finding) => ({
    id: finding.id,
    severity: finding.severity,
    action: finding.action,
    issues: finding.issues,
  })),
  evidencePacket: result.evidencePacket,
}, null, 2));
