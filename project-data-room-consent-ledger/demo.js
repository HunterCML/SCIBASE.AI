"use strict";

const { evaluateProjectDataRoom } = require("./index");

const room = {
  generatedAt: "2026-05-17T12:00:00.000Z",
  identities: [
    {
      id: "pi-morgan",
      name: "Dr. Morgan",
      affiliationType: "institutional",
      links: ["email", "saml", "orcid", "github"],
      mfaVerified: true,
      profileMode: "public",
    },
    {
      id: "external-biostat",
      name: "Dr. Patel",
      affiliationType: "external",
      links: ["email", "orcid"],
      mfaVerified: true,
      trainingExpiresAt: "2026-10-30",
      profileMode: "private",
    },
    {
      id: "blind-reviewer",
      mode: "anonymous-review",
      pseudonym: "Reviewer B",
      affiliationType: "external",
      links: ["email", "orcid", "anonymousProfile", "identityEscrow"],
      mfaVerified: true,
    },
  ],
  projects: [
    {
      id: "project-metabolomics",
      title: "Metabolomics cohort workspace",
      visibility: "institutional-only",
      fundingSource: "Foundation cohort grant",
    },
  ],
  objects: [
    { id: "draft-paper", projectId: "project-metabolomics", kind: "manuscript", sensitivity: "internal" },
    { id: "cohort-table", projectId: "project-metabolomics", kind: "dataset", sensitivity: "restricted" },
    { id: "review-thread", projectId: "project-metabolomics", kind: "discussion", sensitivity: "internal" },
  ],
  consentRecords: [
    {
      id: "consent-biostat-export",
      irbProtocol: "IRB-2026-077",
      dataUseAgreement: "DUA-METAB-2026",
      exportPolicy: "aggregate-results-and-model-coefficients",
    },
  ],
  grants: [
    {
      id: "grant-pi-admin",
      identityId: "pi-morgan",
      projectId: "project-metabolomics",
      objectId: "draft-paper",
      role: "admin",
      actions: ["read", "comment", "edit", "share"],
    },
    {
      id: "grant-biostat-data-room",
      identityId: "external-biostat",
      projectId: "project-metabolomics",
      objectId: "cohort-table",
      role: "admin",
      actions: ["read", "download"],
      consentId: "consent-biostat-export",
      expiresAt: "2026-06-17",
      institutionalSponsor: "pi-morgan",
    },
    {
      id: "grant-anonymous-review",
      identityId: "blind-reviewer",
      projectId: "project-metabolomics",
      objectId: "review-thread",
      role: "reviewer",
      actions: ["read", "comment"],
      expiresAt: "2026-05-31",
      institutionalSponsor: "pi-morgan",
    },
  ],
  auditEvents: [
    { type: "workspace-created", actorId: "pi-morgan", targetId: "project-metabolomics" },
    { type: "consent-attached", actorId: "pi-morgan", targetId: "consent-biostat-export" },
    { type: "grant-approved", actorId: "pi-morgan", targetId: "grant-biostat-data-room" },
    { type: "anonymous-review-opened", actorId: "pi-morgan", targetId: "grant-anonymous-review" },
  ],
};

const result = evaluateProjectDataRoom(room);

console.log("Project data room consent ledger demo");
console.log(JSON.stringify(result.dashboard, null, 2));
console.log("Grant decisions:");
for (const grant of result.grants) {
  console.log(`- ${grant.id}: ${grant.decision} (${grant.role}, ${grant.actions.join(", ")})`);
}
console.log("Export packet:");
console.log(JSON.stringify(result.exportPacket, null, 2));
