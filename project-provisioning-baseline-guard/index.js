const crypto = require("crypto");

const HOUR_MS = 60 * 60 * 1000;

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function unique(values) {
  return [...new Set(asArray(values).map(normalize).filter(Boolean))];
}

function uniqueFields(values) {
  const seen = new Set();
  const fields = [];
  for (const value of asArray(values).filter(Boolean)) {
    const key = normalize(value);
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push(value);
  }
  return fields;
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

function hoursSince(value, now) {
  const time = parseDate(value);
  if (!time || !now) return Infinity;
  return Math.floor((now - time) / HOUR_MS);
}

function addFinding(findings, severity, code, subject, message, remediation) {
  findings.push({ severity, code, subject, message, remediation });
}

function byId(records) {
  return asArray(records).reduce((acc, record) => {
    if (record && record.id) acc[record.id] = record;
    return acc;
  }, {});
}

function hasVerifiedAffiliation(user, institutionId) {
  const target = normalize(institutionId);
  return asArray(user.verifiedAffiliations).some((affiliation) => {
    if (normalize(affiliation.institutionId || affiliation.id) !== target) return false;
    return normalize(affiliation.status || "verified") === "verified";
  });
}

function hasVerifiedIdentifier(user, type) {
  return asArray(user.identifiers).some(
    (identifier) => normalize(identifier.type) === normalize(type) && normalize(identifier.status || "verified") === "verified",
  );
}

function roleAssignmentsFor(assignments, userId) {
  const target = normalize(userId);
  return asArray(assignments).filter((assignment) => normalize(assignment.userId) === target);
}

function hasAnyProjectRole(assignments, roles) {
  const wanted = unique(roles);
  return asArray(assignments).some((assignment) => wanted.includes(normalize(assignment.role)));
}

function approvalExists(approvals, type, subjectId) {
  const targetType = normalize(type);
  const targetSubject = normalize(subjectId);
  return asArray(approvals).some((approval) => {
    if (normalize(approval.type) !== targetType) return false;
    if (targetSubject && normalize(approval.subjectId || approval.userId || approval.projectId) !== targetSubject) return false;
    return normalize(approval.status || "approved") === "approved";
  });
}

function expectedMetadataFields(policy, request, template) {
  const required = [
    ...asArray(policy.requiredMetadataFields),
    ...asArray(template.requiredMetadataFields),
  ];

  if (normalize(request.dataClassification).includes("restricted")) {
    required.push("irbProtocolId", "dataUseAgreementId", "retentionPlan");
  }

  return uniqueFields(required);
}

function readField(record, field) {
  const target = normalize(field);
  for (const [key, value] of Object.entries(record || {})) {
    if (normalize(key) === target) return value;
  }
  return undefined;
}

function visibilityAllowed(policy, request) {
  const classification = normalize(request.dataClassification);
  const visibility = normalize(request.visibility);
  const allowedByClass = policy.visibilityByClassification || {};
  const allowed = unique(allowedByClass[classification] || policy.allowedVisibilities || []);

  if (allowed.length === 0) return true;
  return allowed.includes(visibility);
}

function grantTouchesRestrictedData(grant) {
  const objectType = normalize(grant.objectType || grant.resourceType);
  const permissions = unique(grant.permissions || grant.permission);
  return objectType.includes("restricted") || objectType.includes("human-subject") || permissions.some((permission) => ["download", "export", "share"].includes(permission));
}

function publicProvisioningSummary(request, decision, counts) {
  return {
    projectId: request.projectId,
    projectName: request.name,
    templateId: request.templateId,
    visibility: request.visibility,
    dataClassification: request.dataClassification,
    decision,
    findingCounts: counts,
  };
}

function evaluateRequester(request, usersById, policy, findings, now) {
  const requester = usersById[request.requesterId] || {};
  const requesterAssignments = roleAssignmentsFor(request.roleAssignments, request.requesterId);
  const authorityRoles = policy.creatorRoles || ["principal-investigator", "project-admin", "institution-admin"];
  const maxMfaAgeHours = Number(policy.maxMfaAgeHours || 24);

  if (!requester.id) {
    addFinding(
      findings,
      "blocker",
      "REQUESTER_PROFILE_MISSING",
      request.requesterId || "requester",
      "Project provisioning requires a resolvable requester profile.",
      "Load the requester profile before creating the workspace.",
    );
    return;
  }

  if (!requester.projectCreator && !hasAnyProjectRole(requesterAssignments, authorityRoles)) {
    addFinding(
      findings,
      "blocker",
      "REQUESTER_AUTHORITY_MISSING",
      requester.id,
      "Requester lacks a creator flag or approved project creation role.",
      "Require a principal investigator, project admin, institution admin, or explicit projectCreator grant.",
    );
  }

  if (!hasVerifiedAffiliation(requester, request.institutionId)) {
    addFinding(
      findings,
      "blocker",
      "REQUESTER_AFFILIATION_UNVERIFIED",
      requester.id,
      "Requester does not have a verified affiliation for the target institution.",
      "Verify institutional SAML, domain, or administrator evidence before provisioning.",
    );
  }

  if (!hasVerifiedIdentifier(requester, "orcid")) {
    addFinding(
      findings,
      "warning",
      "REQUESTER_ORCID_UNVERIFIED",
      requester.id,
      "Requester profile lacks a verified ORCID identifier.",
      "Allow steward review or require ORCID linkage before public researcher profile exposure.",
    );
  }

  if (hoursSince(requester.mfaAt, now) > maxMfaAgeHours) {
    addFinding(
      findings,
      "blocker",
      "REQUESTER_MFA_STALE",
      requester.id,
      `Requester MFA is older than ${maxMfaAgeHours} hour(s).`,
      "Require a fresh MFA challenge before opening the project space.",
    );
  }
}

function evaluateMetadata(request, policy, template, findings) {
  const metadata = request.metadata || {};
  for (const field of expectedMetadataFields(policy, request, template)) {
    const value = readField(metadata, field) || readField(request, field);
    if (!value) {
      addFinding(
        findings,
        "blocker",
        "REQUIRED_METADATA_MISSING",
        field,
        `Required project provisioning metadata is missing: ${field}.`,
        "Collect the missing metadata before the workspace is created.",
      );
    }
  }

  const projectName = String(request.name || metadata.projectName || "");
  if (projectName.trim().length < Number(policy.minimumProjectNameLength || 6)) {
    addFinding(
      findings,
      "warning",
      "PROJECT_NAME_TOO_SHORT",
      request.projectId || "project",
      "Project name is too short for reviewer and audit records.",
      "Require a descriptive title before showing the workspace in project lists.",
    );
  }
}

function evaluateVisibility(request, policy, findings) {
  if (!visibilityAllowed(policy, request)) {
    addFinding(
      findings,
      "blocker",
      "VISIBILITY_CLASSIFICATION_CONFLICT",
      request.visibility,
      `Visibility ${request.visibility} is not allowed for ${request.dataClassification} projects.`,
      "Lower visibility or reclassify the project before provisioning.",
    );
  }

  if (normalize(request.visibility) === "public" && asArray(request.externalCollaborators).length > 0) {
    addFinding(
      findings,
      "info",
      "PUBLIC_PROJECT_EXTERNAL_COLLABORATORS",
      request.projectId || "project",
      "Public project includes external collaborators at creation time.",
      "Keep object-level grants narrow and retain collaborator audit evidence.",
    );
  }
}

function evaluateTemplate(request, policy, findings) {
  const template = (policy.templates || {})[request.templateId] || {};
  if (!template.id && request.templateId) {
    addFinding(
      findings,
      "warning",
      "UNKNOWN_TEMPLATE_ID",
      request.templateId,
      "Project references a template that is not registered in the provisioning policy.",
      "Route to steward review or register the template baseline before launch.",
    );
  }

  const allowedClassifications = unique(template.allowedClassifications);
  if (allowedClassifications.length > 0 && !allowedClassifications.includes(normalize(request.dataClassification))) {
    addFinding(
      findings,
      "blocker",
      "TEMPLATE_CLASSIFICATION_MISMATCH",
      request.templateId,
      "Selected project template is not approved for this data classification.",
      "Choose an approved template or add steward approval for the classification.",
    );
  }

  for (const control of asArray(template.requiredControls)) {
    if (!request.controls || request.controls[control] !== true) {
      addFinding(
        findings,
        "blocker",
        "TEMPLATE_CONTROL_MISSING",
        control,
        `Template control ${control} has not been enabled.`,
        "Enable the required template control before creating the workspace.",
      );
    }
  }

  return template;
}

function evaluateInitialRoles(request, policy, template, usersById, findings) {
  const roleAssignments = asArray(request.roleAssignments);
  const requiredRoles = unique([...(policy.requiredProjectRoles || ["owner"]), ...asArray(template.requiredProjectRoles)]);

  for (const role of requiredRoles) {
    if (!hasAnyProjectRole(roleAssignments, [role])) {
      addFinding(
        findings,
        "blocker",
        "REQUIRED_PROJECT_ROLE_MISSING",
        role,
        `Project is missing required initial role: ${role}.`,
        "Add the required role assignment before provisioning.",
      );
    }
  }

  for (const assignment of roleAssignments) {
    const user = usersById[assignment.userId] || {};
    if (!user.id) {
      addFinding(
        findings,
        "blocker",
        "ROLE_ASSIGNEE_MISSING",
        assignment.userId || "unknown",
        "Initial role assignment references a missing user profile.",
        "Resolve every role assignee before committing the role matrix.",
      );
      continue;
    }

    if (normalize(user.type) === "external" && ["owner", "project-admin", "data-steward"].includes(normalize(assignment.role))) {
      addFinding(
        findings,
        "blocker",
        "EXTERNAL_COLLABORATOR_PRIVILEGED_ROLE",
        user.id,
        "External collaborator is assigned a privileged launch role.",
        "Use a viewer, contributor, or scoped collaborator role until sponsor approval is recorded.",
      );
    }
  }
}

function evaluateExternalCollaborators(request, policy, usersById, findings) {
  const approvals = asArray(request.approvals);
  const objectGrants = asArray(request.objectGrants);
  const allowedDomains = unique(policy.allowedExternalDomains);

  for (const collaboratorRef of asArray(request.externalCollaborators)) {
    const collaboratorId = typeof collaboratorRef === "string" ? collaboratorRef : collaboratorRef.userId || collaboratorRef.id;
    const collaborator = usersById[collaboratorId] || {};
    if (!collaborator.id) {
      addFinding(
        findings,
        "blocker",
        "EXTERNAL_COLLABORATOR_PROFILE_MISSING",
        collaboratorId,
        "External collaborator profile is missing.",
        "Invite or verify the collaborator profile before provisioning.",
      );
      continue;
    }

    const emailDomain = normalize(collaborator.email || "").split("@")[1] || normalize(collaborator.domain);
    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      addFinding(
        findings,
        "warning",
        "EXTERNAL_DOMAIN_NOT_ALLOWLISTED",
        collaborator.id,
        `External collaborator domain ${emailDomain || "unknown"} is not allowlisted.`,
        "Require sponsor review before retaining this collaborator at project launch.",
      );
    }

    const restrictedGrant = objectGrants.some(
      (grant) => normalize(grant.principalId || grant.userId) === normalize(collaborator.id) && grantTouchesRestrictedData(grant),
    );
    if (restrictedGrant && !approvalExists(approvals, "data-use-agreement", collaborator.id)) {
      addFinding(
        findings,
        "blocker",
        "EXTERNAL_RESTRICTED_DATA_APPROVAL_MISSING",
        collaborator.id,
        "External collaborator has a restricted data grant without data-use agreement approval.",
        "Add data-use agreement evidence or remove the restricted grant.",
      );
    }

    const hasCurrentRestrictedTraining = collaborator.training && normalize(collaborator.training.restrictedData) === "current";
    if (restrictedGrant && !hasCurrentRestrictedTraining) {
      addFinding(
        findings,
        "warning",
        "EXTERNAL_RESTRICTED_DATA_TRAINING_GAP",
        collaborator.id,
        "External collaborator restricted-data training is missing or stale.",
        "Require current training evidence before enabling restricted data access.",
      );
    }
  }
}

function evaluateAuditEvidence(request, findings) {
  const eventTypes = unique(asArray(request.auditEvents).map((event) => event.type));
  for (const expected of ["provision-requested", "baseline-evaluated"]) {
    if (!eventTypes.includes(expected)) {
      addFinding(
        findings,
        "warning",
        "AUDIT_EVENT_MISSING",
        expected,
        `Audit event ${expected} is missing from the provisioning packet.`,
        "Record immutable launch evidence before approving the workspace.",
      );
    }
  }
}

function findingCounts(findings) {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    },
    { blocker: 0, warning: 0, info: 0 },
  );
}

function evaluateProjectProvisioning(packet = {}) {
  const policy = packet.policy || {};
  const request = packet.request || {};
  const usersById = byId(packet.users);
  const now = parseDate(packet.now || new Date().toISOString());
  const findings = [];
  const template = evaluateTemplate(request, policy, findings);

  evaluateRequester(request, usersById, policy, findings, now);
  evaluateMetadata(request, policy, template, findings);
  evaluateVisibility(request, policy, findings);
  evaluateInitialRoles(request, policy, template, usersById, findings);
  evaluateExternalCollaborators(request, policy, usersById, findings);
  evaluateAuditEvidence(request, findings);

  const counts = findingCounts(findings);
  const decision =
    counts.blocker > 0
      ? "hold-provisioning"
      : counts.warning > 0
        ? "provision-with-steward-review"
        : "provision-ready";
  const actionQueue = findings.map((finding) => ({
    severity: finding.severity,
    code: finding.code,
    subject: finding.subject,
    remediation: finding.remediation,
  }));
  const result = {
    generatedAt: packet.now || new Date().toISOString(),
    decision,
    projectId: request.projectId,
    counts,
    findings,
    actionQueue,
    publicSummary: publicProvisioningSummary(request, decision, counts),
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

module.exports = {
  evaluateProjectProvisioning,
  stableStringify,
};
