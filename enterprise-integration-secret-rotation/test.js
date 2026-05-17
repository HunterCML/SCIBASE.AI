"use strict";

const assert = require("node:assert/strict");
const { evaluateEnterpriseIntegrationGovernance } = require("./index");

const now = "2026-05-17T01:25:00.000Z";

const sampleInput = {
  generatedAt: now,
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
      id: "api-canvas-stage",
      name: "Canvas course roster import",
      systems: ["Canvas"],
      environment: "staging",
      scopes: ["course:read", "user:read"],
      allowedScopes: ["course:read", "user:read"],
      owner: { name: "Learning Systems", email: "canvas@example.edu" },
      credentialLastRotatedAt: "2026-05-01T00:00:00.000Z",
      credentialLastUsedAt: "2026-05-16T00:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
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

const result = evaluateEnterpriseIntegrationGovernance(sampleInput, { now });

assert.equal(result.dashboard.apiClients, 2);
assert.equal(result.dashboard.webhookDestinations, 2);
assert.equal(result.dashboard.monitoredSystems, 5);
assert.equal(result.dashboard.criticalCount, 2);
assert.equal(result.dashboard.highRiskCount, 2);
assert.equal(result.dashboard.belowPolicyFloor, true);

const dspace = result.findings.find((item) => item.id === "api-dspace-prod");
assert.ok(dspace.riskScore >= 80);
assert.equal(dspace.severity, "critical");
assert.deepEqual(dspace.unauthorizedScopes, ["admin:*"]);
assert.ok(dspace.issues.some((issue) => issue.includes("expired")));
assert.ok(dspace.issues.some((issue) => issue.includes("break-glass")));

const canvas = result.findings.find((item) => item.id === "api-canvas-stage");
assert.equal(canvas.severity, "low");
assert.equal(canvas.action, "monitor");

const eln = result.findings.find((item) => item.id === "hook-eln-publication");
assert.equal(eln.severity, "critical");
assert.ok(eln.issues.some((issue) => issue.includes("overlap")));
assert.ok(eln.issues.some((issue) => issue.includes("dead-letter")));
assert.ok(eln.issues.some((issue) => issue.includes("idempotency")));

const reporter = result.findings.find((item) => item.id === "hook-funder-report");
assert.equal(reporter.severity, "low");
assert.equal(reporter.action, "monitor");

assert.equal(result.evidencePacket.scope, "enterprise-api-webhook-secret-rotation");
assert.match(result.evidencePacket.packetDigest, /^[a-f0-9]{64}$/);
assert.match(result.evidencePacket.sourceDigest, /^[a-f0-9]{64}$/);

console.log("enterprise integration secret rotation tests passed");
