"use strict";

const crypto = require("node:crypto");

const ROLE_ACTIONS = {
  owner: ["read", "comment", "edit", "download", "share", "admin"],
  admin: ["read", "comment", "edit", "download", "share"],
  contributor: ["read", "comment", "edit"],
  reviewer: ["read", "comment"],
  viewer: ["read"],
};

const REQUIRED_IDENTITY_LINKS = {
  institutional: ["email", "saml"],
  external: ["email", "orcid"],
  anonymousReview: ["anonymousProfile", "identityEscrow"],
};

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRole(role) {
  return String(role || "viewer").trim().toLowerCase();
}

function actionAllowed(role, action) {
  return asArray(ROLE_ACTIONS[normalizeRole(role)]).includes(action);
}

function evaluateIdentity(identity, now = "2026-05-17T12:00:00.000Z") {
  const links = new Set(asArray(identity.links).map((link) => String(link).trim()));
  const findings = [];
  const requiredLinks = new Set();

  if (identity.affiliationType === "institutional") {
    REQUIRED_IDENTITY_LINKS.institutional.forEach((link) => requiredLinks.add(link));
  }
  if (identity.affiliationType === "external") {
    REQUIRED_IDENTITY_LINKS.external.forEach((link) => requiredLinks.add(link));
  }
  if (identity.mode === "anonymous-review") {
    REQUIRED_IDENTITY_LINKS.anonymousReview.forEach((link) => requiredLinks.add(link));
  }

  for (const link of requiredLinks) {
    if (!links.has(link)) {
      findings.push({
        severity: "blocker",
        code: "missing-identity-link",
        message: `${identity.id} is missing required ${link} identity evidence`,
      });
    }
  }

  if (identity.requiresMfa !== false && !identity.mfaVerified) {
    findings.push({
      severity: "blocker",
      code: "mfa-not-verified",
      message: `${identity.id} needs MFA verification before project access`,
    });
  }

  if (identity.trainingExpiresAt && identity.trainingExpiresAt < now.slice(0, 10)) {
    findings.push({
      severity: "warning",
      code: "training-expired",
      message: `${identity.id} has expired access training evidence`,
    });
  }

  return {
    id: identity.id,
    displayName: identity.mode === "anonymous-review" ? identity.pseudonym || "anonymous reviewer" : identity.name,
    affiliationType: identity.affiliationType || "internal",
    profileMode: identity.profileMode || "private",
    links: [...links].sort(),
    verified: findings.every((finding) => finding.severity !== "blocker"),
    findings,
  };
}

function evaluateGrant(grant, context) {
  const findings = [];
  const role = normalizeRole(grant.role);
  const requestedActions = asArray(grant.actions);
  const identity = context.identityById.get(grant.identityId);
  const project = context.projectById.get(grant.projectId);
  const object = context.objectById.get(grant.objectId);
  const consent = context.consentById.get(grant.consentId);

  if (!identity) {
    findings.push({ severity: "blocker", code: "unknown-identity", message: `${grant.id} references an unknown identity` });
  }
  if (!project) {
    findings.push({ severity: "blocker", code: "unknown-project", message: `${grant.id} references an unknown project` });
  }
  if (!object) {
    findings.push({ severity: "blocker", code: "unknown-object", message: `${grant.id} references an unknown project object` });
  }

  for (const action of requestedActions) {
    if (!actionAllowed(role, action)) {
      findings.push({
        severity: "blocker",
        code: "role-action-mismatch",
        message: `${grant.id} requests ${action} but ${role} cannot perform that action`,
      });
    }
  }

  if (identity && identity.affiliationType === "external" && !grant.expiresAt) {
    findings.push({
      severity: "blocker",
      code: "external-access-needs-expiry",
      message: `${grant.id} gives an external collaborator access without an expiry date`,
    });
  }

  if (object && object.sensitivity === "restricted" && requestedActions.includes("download")) {
    if (!consent) {
      findings.push({
        severity: "blocker",
        code: "missing-data-use-consent",
        message: `${grant.id} needs a data-use consent record before restricted downloads`,
      });
    } else {
      if (!consent.irbProtocol || !consent.dataUseAgreement) {
        findings.push({
          severity: "blocker",
          code: "incomplete-data-use-consent",
          message: `${grant.id} consent is missing IRB or data-use agreement evidence`,
        });
      }
      if (!consent.exportPolicy || consent.exportPolicy === "none") {
        findings.push({
          severity: "warning",
          code: "missing-export-policy",
          message: `${grant.id} consent should name the permitted export policy`,
        });
      }
    }
  }

  if (project && project.visibility === "institutional-only" && identity && identity.affiliationType === "external") {
    if (!grant.institutionalSponsor) {
      findings.push({
        severity: "blocker",
        code: "external-institutional-sponsor-required",
        message: `${grant.id} needs an institutional sponsor for institutional-only workspace access`,
      });
    }
  }

  return {
    id: grant.id,
    identityId: grant.identityId,
    projectId: grant.projectId,
    objectId: grant.objectId,
    role,
    actions: requestedActions,
    expiresAt: grant.expiresAt || null,
    decision: findings.some((finding) => finding.severity === "blocker") ? "hold" : "approve",
    findings,
    auditDigest: stableDigest({
      grantId: grant.id,
      identityId: grant.identityId,
      projectId: grant.projectId,
      objectId: grant.objectId,
      role,
      actions: requestedActions,
      consentId: grant.consentId || null,
      expiresAt: grant.expiresAt || null,
    }),
  };
}

function buildAuditChain(events) {
  let previous = "0".repeat(64);
  return asArray(events).map((event, index) => {
    const digest = stableDigest({ index, previous, event });
    previous = digest;
    return {
      index,
      eventType: event.type,
      actorId: event.actorId,
      targetId: event.targetId,
      digest,
    };
  });
}

function evaluateProjectDataRoom(input) {
  const identities = asArray(input.identities).map((identity) => evaluateIdentity(identity, input.generatedAt));
  const identityById = new Map(asArray(input.identities).map((identity) => [identity.id, identity]));
  const projectById = new Map(asArray(input.projects).map((project) => [project.id, project]));
  const objectById = new Map(asArray(input.objects).map((object) => [object.id, object]));
  const consentById = new Map(asArray(input.consentRecords).map((consent) => [consent.id, consent]));
  const grants = asArray(input.grants).map((grant) =>
    evaluateGrant(grant, { identityById, projectById, objectById, consentById })
  );
  const auditChain = buildAuditChain(input.auditEvents);
  const findings = [
    ...identities.flatMap((identity) => identity.findings),
    ...grants.flatMap((grant) => grant.findings),
  ];

  const approvedGrants = grants.filter((grant) => grant.decision === "approve");
  const heldGrants = grants.filter((grant) => grant.decision === "hold");

  const exportPacket = {
    generatedAt: input.generatedAt,
    projectCount: asArray(input.projects).length,
    approvedGrantDigests: approvedGrants.map((grant) => grant.auditDigest).sort(),
    heldGrantIds: heldGrants.map((grant) => grant.id).sort(),
    auditRoot: auditChain.length ? auditChain[auditChain.length - 1].digest : "0".repeat(64),
  };
  exportPacket.packetDigest = stableDigest(exportPacket);

  return {
    dashboard: {
      identities: identities.length,
      verifiedIdentities: identities.filter((identity) => identity.verified).length,
      projects: asArray(input.projects).length,
      objects: asArray(input.objects).length,
      approvedGrants: approvedGrants.length,
      heldGrants: heldGrants.length,
      blockers: findings.filter((finding) => finding.severity === "blocker").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      accessReady: heldGrants.length === 0 && findings.every((finding) => finding.severity !== "blocker"),
    },
    identities,
    grants,
    findings,
    auditChain,
    exportPacket,
  };
}

module.exports = {
  actionAllowed,
  buildAuditChain,
  evaluateGrant,
  evaluateIdentity,
  evaluateProjectDataRoom,
  stableDigest,
};
