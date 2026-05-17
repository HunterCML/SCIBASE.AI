"use strict";

const assert = require("node:assert/strict");
const {
  actionAllowed,
  buildAuditChain,
  evaluateIdentity,
  evaluateProjectDataRoom,
  stableDigest,
} = require("./index");

const validRoom = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  identities: [
    {
      id: "user-lead",
      name: "Dr. Rivera",
      affiliationType: "institutional",
      links: ["email", "saml", "orcid"],
      mfaVerified: true,
      profileMode: "public",
    },
    {
      id: "user-external-reviewer",
      name: "Dr. Chen",
      affiliationType: "external",
      links: ["email", "orcid"],
      mfaVerified: true,
      trainingExpiresAt: "2026-12-31",
      profileMode: "private",
    },
  ],
  projects: [
    {
      id: "project-neuro-2026",
      title: "Neuroimaging replication workspace",
      visibility: "institutional-only",
      fundingSource: "NIH pilot grant",
    },
  ],
  objects: [
    { id: "manuscript", projectId: "project-neuro-2026", kind: "document", sensitivity: "internal" },
    { id: "participant-data", projectId: "project-neuro-2026", kind: "dataset", sensitivity: "restricted" },
  ],
  consentRecords: [
    {
      id: "consent-restricted-download",
      irbProtocol: "IRB-2026-014",
      dataUseAgreement: "DUA-NEURO-2026",
      exportPolicy: "aggregate-results-only",
    },
  ],
  grants: [
    {
      id: "grant-lead-edit",
      identityId: "user-lead",
      projectId: "project-neuro-2026",
      objectId: "manuscript",
      role: "admin",
      actions: ["read", "comment", "edit", "share"],
    },
    {
      id: "grant-reviewer-download",
      identityId: "user-external-reviewer",
      projectId: "project-neuro-2026",
      objectId: "participant-data",
      role: "admin",
      actions: ["read", "download"],
      consentId: "consent-restricted-download",
      expiresAt: "2026-06-17",
      institutionalSponsor: "user-lead",
    },
  ],
  auditEvents: [
    { type: "project-created", actorId: "user-lead", targetId: "project-neuro-2026" },
    { type: "grant-approved", actorId: "user-lead", targetId: "grant-reviewer-download" },
  ],
};

const ready = evaluateProjectDataRoom(validRoom);
assert.equal(actionAllowed("reviewer", "comment"), true);
assert.equal(actionAllowed("reviewer", "download"), false);
assert.equal(ready.dashboard.identities, 2);
assert.equal(ready.dashboard.verifiedIdentities, 2);
assert.equal(ready.dashboard.approvedGrants, 2);
assert.equal(ready.dashboard.heldGrants, 0);
assert.equal(ready.dashboard.blockers, 0);
assert.equal(ready.dashboard.accessReady, true);
assert.match(ready.exportPacket.auditRoot, /^[a-f0-9]{64}$/);
assert.match(ready.exportPacket.packetDigest, /^[a-f0-9]{64}$/);
assert.equal(ready.auditChain.length, 2);
assert.notEqual(ready.auditChain[0].digest, ready.auditChain[1].digest);

const brokenRoom = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  identities: [
    {
      id: "external-no-proof",
      name: "Contract Analyst",
      affiliationType: "external",
      links: ["email"],
      mfaVerified: false,
    },
  ],
  projects: [{ id: "project-private", visibility: "institutional-only" }],
  objects: [{ id: "raw-participants", projectId: "project-private", sensitivity: "restricted" }],
  grants: [
    {
      id: "grant-unsafe",
      identityId: "external-no-proof",
      projectId: "project-private",
      objectId: "raw-participants",
      role: "viewer",
      actions: ["read", "download"],
    },
  ],
};

const held = evaluateProjectDataRoom(brokenRoom);
assert.equal(held.dashboard.accessReady, false);
assert.equal(held.dashboard.heldGrants, 1);
assert.ok(held.findings.some((finding) => finding.code === "mfa-not-verified"));
assert.ok(held.findings.some((finding) => finding.code === "missing-identity-link"));
assert.ok(held.findings.some((finding) => finding.code === "role-action-mismatch"));
assert.ok(held.findings.some((finding) => finding.code === "missing-data-use-consent"));
assert.ok(held.findings.some((finding) => finding.code === "external-access-needs-expiry"));
assert.ok(held.findings.some((finding) => finding.code === "external-institutional-sponsor-required"));

const anonymous = evaluateIdentity({
  id: "anon-reviewer-1",
  mode: "anonymous-review",
  pseudonym: "Reviewer A",
  affiliationType: "external",
  links: ["email", "orcid", "anonymousProfile", "identityEscrow"],
  mfaVerified: true,
});
assert.equal(anonymous.displayName, "Reviewer A");
assert.equal(anonymous.verified, true);

const chainA = buildAuditChain([{ type: "a" }, { type: "b" }]);
const chainB = buildAuditChain([{ type: "a" }, { type: "b" }]);
assert.deepEqual(chainA, chainB);
assert.equal(stableDigest({ b: 2, a: 1 }), stableDigest({ a: 1, b: 2 }));

console.log("project data room consent ledger tests passed");
