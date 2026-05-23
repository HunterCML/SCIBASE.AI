const assert = require("assert");
const { evaluateProjectProvisioning } = require("./index");

function basePacket(overrides = {}) {
  const packet = {
    now: "2026-06-01T12:00:00Z",
    policy: {
      maxMfaAgeHours: 12,
      minimumProjectNameLength: 6,
      requiredMetadataFields: ["projectName", "projectPurpose", "discipline", "institutionId", "dataClassification"],
      requiredProjectRoles: ["owner"],
      creatorRoles: ["principal-investigator", "project-admin", "institution-admin"],
      allowedExternalDomains: ["partner-lab.org"],
      visibilityByClassification: {
        open: ["public", "institutional", "private"],
        controlled: ["institutional", "private"],
        "restricted-human-subjects": ["private"],
      },
      templates: {
        "controlled-study": {
          id: "controlled-study",
          allowedClassifications: ["controlled", "restricted-human-subjects"],
          requiredMetadataFields: ["retentionPlan"],
          requiredProjectRoles: ["data-steward"],
          requiredControls: ["auditTrail", "objectGrantReview"],
        },
      },
    },
    users: [
      {
        id: "user-pi-ada",
        type: "internal",
        projectCreator: true,
        email: "ada@northbridge.edu",
        mfaAt: "2026-06-01T08:00:00Z",
        verifiedAffiliations: [{ institutionId: "northbridge", status: "verified" }],
        identifiers: [{ type: "orcid", value: "0000-0002-1825-0097", status: "verified" }],
      },
      {
        id: "user-steward-lin",
        type: "internal",
        email: "lin@northbridge.edu",
        verifiedAffiliations: [{ institutionId: "northbridge", status: "verified" }],
        identifiers: [{ type: "orcid", value: "0000-0001-5555-1212", status: "verified" }],
      },
      {
        id: "user-ext-ren",
        type: "external",
        email: "ren@partner-lab.org",
        training: { restrictedData: "current" },
        verifiedAffiliations: [{ institutionId: "partner-lab", status: "verified" }],
        identifiers: [{ type: "orcid", value: "0000-0003-9999-8888", status: "verified" }],
      },
    ],
    request: {
      requestId: "provision-1",
      projectId: "project-neuro-qc",
      name: "Neuro QC Consortium",
      requesterId: "user-pi-ada",
      institutionId: "northbridge",
      templateId: "controlled-study",
      dataClassification: "controlled",
      visibility: "institutional",
      metadata: {
        projectName: "Neuro QC Consortium",
        projectPurpose: "Coordinate reproducible quality-control notebooks for multi-site neuroimaging studies.",
        discipline: "neuroscience",
        institutionId: "northbridge",
        dataClassification: "controlled",
        retentionPlan: "retain-seven-years",
      },
      controls: {
        auditTrail: true,
        objectGrantReview: true,
      },
      roleAssignments: [
        { userId: "user-pi-ada", role: "owner", scope: "project" },
        { userId: "user-steward-lin", role: "data-steward", scope: "project" },
        { userId: "user-ext-ren", role: "viewer", scope: "project" },
      ],
      objectGrants: [
        { principalId: "user-pi-ada", objectType: "workspace", permissions: ["admin"] },
        { principalId: "user-steward-lin", objectType: "controlled-dataset", permissions: ["read", "review"] },
        { principalId: "user-ext-ren", objectType: "manuscript", permissions: ["read"] },
      ],
      externalCollaborators: ["user-ext-ren"],
      approvals: [{ type: "sponsor-review", status: "approved", subjectId: "project-neuro-qc" }],
      auditEvents: [
        { type: "provision-requested", actorId: "user-pi-ada", at: "2026-06-01T08:03:00Z" },
        { type: "baseline-evaluated", actorId: "system", at: "2026-06-01T08:04:00Z" },
      ],
    },
  };

  return {
    ...packet,
    ...overrides,
    policy: { ...packet.policy, ...(overrides.policy || {}) },
    request: { ...packet.request, ...(overrides.request || {}) },
  };
}

function testReadyControlledProject() {
  const result = evaluateProjectProvisioning(basePacket());

  assert.equal(result.decision, "provision-ready");
  assert.equal(result.counts.blocker, 0);
  assert.equal(result.publicSummary.visibility, "institutional");
}

function testRestrictedProjectCannotStartPublic() {
  const packet = basePacket({
    request: {
      dataClassification: "restricted-human-subjects",
      visibility: "public",
      metadata: {
        projectName: "Neuro QC Consortium",
        projectPurpose: "Coordinate reproducible quality-control notebooks for multi-site neuroimaging studies.",
        discipline: "neuroscience",
        institutionId: "northbridge",
        dataClassification: "restricted-human-subjects",
        retentionPlan: "retain-seven-years",
        irbProtocolId: "IRB-2026-17",
        dataUseAgreementId: "DUA-99",
      },
    },
  });
  const result = evaluateProjectProvisioning(packet);

  assert.equal(result.decision, "hold-provisioning");
  assert.ok(result.findings.some((finding) => finding.code === "VISIBILITY_CLASSIFICATION_CONFLICT"));
}

function testRequesterAuthorityAndMfaAreRequired() {
  const packet = basePacket();
  packet.users[0].projectCreator = false;
  packet.users[0].mfaAt = "2026-05-01T08:00:00Z";
  packet.request.roleAssignments = packet.request.roleAssignments.filter((assignment) => assignment.userId !== "user-pi-ada");

  const result = evaluateProjectProvisioning(packet);

  assert.equal(result.decision, "hold-provisioning");
  assert.ok(result.findings.some((finding) => finding.code === "REQUESTER_AUTHORITY_MISSING"));
  assert.ok(result.findings.some((finding) => finding.code === "REQUESTER_MFA_STALE"));
}

function testExternalRestrictedGrantNeedsAgreement() {
  const packet = basePacket({
    request: {
      dataClassification: "restricted-human-subjects",
      visibility: "private",
      metadata: {
        projectName: "Neuro QC Consortium",
        projectPurpose: "Coordinate reproducible quality-control notebooks for multi-site neuroimaging studies.",
        discipline: "neuroscience",
        institutionId: "northbridge",
        dataClassification: "restricted-human-subjects",
        retentionPlan: "retain-seven-years",
        irbProtocolId: "IRB-2026-17",
        dataUseAgreementId: "DUA-99",
      },
      objectGrants: [
        { principalId: "user-ext-ren", objectType: "restricted-dataset", permissions: ["read", "export"] },
      ],
      approvals: [],
    },
  });
  const result = evaluateProjectProvisioning(packet);

  assert.equal(result.decision, "hold-provisioning");
  assert.ok(result.findings.some((finding) => finding.code === "EXTERNAL_RESTRICTED_DATA_APPROVAL_MISSING"));
}

function testMissingTemplateControlBlocksProvisioning() {
  const packet = basePacket();
  packet.request.controls.objectGrantReview = false;
  const result = evaluateProjectProvisioning(packet);

  assert.equal(result.decision, "hold-provisioning");
  assert.ok(result.findings.some((finding) => finding.code === "TEMPLATE_CONTROL_MISSING"));
}

function testDeterministicDigest() {
  const first = evaluateProjectProvisioning(basePacket());
  const second = evaluateProjectProvisioning(basePacket());

  assert.equal(first.auditDigest, second.auditDigest);
}

testReadyControlledProject();
testRestrictedProjectCannotStartPublic();
testRequesterAuthorityAndMfaAreRequired();
testExternalRestrictedGrantNeedsAgreement();
testMissingTemplateControlBlocksProvisioning();
testDeterministicDigest();

console.log("project-provisioning-baseline-guard tests passed");
