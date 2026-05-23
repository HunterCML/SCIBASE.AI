const fs = require("fs");
const path = require("path");
const { evaluateProjectProvisioning } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

function packetForDemo() {
  return {
    now: "2026-06-01T12:00:00Z",
    policy: {
      maxMfaAgeHours: 12,
      requiredMetadataFields: ["projectName", "projectPurpose", "discipline", "institutionId", "dataClassification"],
      requiredProjectRoles: ["owner"],
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
      controls: { auditTrail: true, objectGrantReview: true },
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
}

function markdownReport(report) {
  return [
    "# Project Provisioning Baseline Guard Demo",
    "",
    `Decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Public Summary",
    "",
    `- Project: ${report.publicSummary.projectName} (${report.projectId})`,
    `- Template: ${report.publicSummary.templateId}`,
    `- Visibility: ${report.publicSummary.visibility}`,
    `- Data classification: ${report.publicSummary.dataClassification}`,
    "",
    "## Finding Counts",
    "",
    `- Blockers: ${report.counts.blocker}`,
    `- Warnings: ${report.counts.warning}`,
    `- Info: ${report.counts.info}`,
    "",
    "## Action Queue",
    "",
    ...(report.actionQueue.length
      ? report.actionQueue.map((action) => `- ${action.severity} ${action.code} (${action.subject}): ${action.remediation}`)
      : ["- No remediation actions required."]),
    "",
  ].join("\n");
}

function svgReport(report) {
  const blocked = report.counts.blocker;
  const warnings = report.counts.warning;
  const readyColor = report.decision === "provision-ready" ? "#68d391" : "#f6ad55";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Project Provisioning Baseline Guard Demo</title>
  <desc id="desc">A user and project management demo showing project launch controls, identity evidence, visibility rules, role grants, and audit evidence.</desc>
  <rect width="1280" height="720" fill="#0d1726"/>
  <rect x="0" y="0" width="1280" height="132" fill="#10243a"/>
  <text x="64" y="52" fill="#d8e8f7" font-family="Arial, sans-serif" font-size="23">SCIBASE bounty demo artifact</text>
  <text x="64" y="102" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">Project Provisioning Baseline Guard</text>
  <text x="66" y="158" fill="#b8cbe1" font-family="Arial, sans-serif" font-size="24">Issue #11: user and project management launch governance</text>
  <rect x="64" y="214" width="542" height="318" fill="#ffffff" opacity="0.94"/>
  <rect x="676" y="214" width="540" height="318" fill="#07101c" opacity="0.88"/>
  <text x="96" y="260" fill="#16405f" font-family="Arial, sans-serif" font-size="18" font-weight="700">PROVISIONING BASELINE</text>
  <text x="96" y="314" fill="#152036" font-family="Arial, sans-serif" font-size="24">1. Verify requester authority and MFA</text>
  <text x="96" y="356" fill="#152036" font-family="Arial, sans-serif" font-size="24">2. Check metadata and template controls</text>
  <text x="96" y="398" fill="#152036" font-family="Arial, sans-serif" font-size="24">3. Enforce visibility by data classification</text>
  <text x="96" y="440" fill="#152036" font-family="Arial, sans-serif" font-size="24">4. Validate initial roles and object grants</text>
  <text x="96" y="482" fill="#152036" font-family="Arial, sans-serif" font-size="24">5. Emit audit digest and action queue</text>
  <text x="708" y="262" fill="#68d391" font-family="Consolas, monospace" font-size="18">$ node project-provisioning-baseline-guard/test.js</text>
  <text x="708" y="318" fill="${readyColor}" font-family="Arial, sans-serif" font-size="25" font-weight="700">decision: ${report.decision}</text>
  <text x="708" y="362" fill="#e9f7ef" font-family="Arial, sans-serif" font-size="22">blockers: ${blocked} | warnings: ${warnings}</text>
  <text x="708" y="416" fill="#a8bdd1" font-family="Arial, sans-serif" font-size="18">Reviewer artifacts</text>
  <text x="708" y="454" fill="#ffffff" font-family="Arial, sans-serif" font-size="22">reports/provisioning-baseline-packet.json</text>
  <text x="708" y="488" fill="#ffffff" font-family="Arial, sans-serif" font-size="22">reports/provisioning-baseline-report.md</text>
  <rect x="64" y="590" width="38" height="8" fill="#68d391"/>
  <rect x="118" y="590" width="38" height="8" fill="#ffffff" opacity="0.3"/>
  <rect x="172" y="590" width="38" height="8" fill="#ffffff" opacity="0.3"/>
  <text x="64" y="650" fill="#d8e8f7" font-family="Arial, sans-serif" font-size="21">Synthetic project launch packet + deterministic audit evidence</text>
</svg>
`;
}

const report = evaluateProjectProvisioning(packetForDemo());
const jsonPath = path.join(outputDir, "provisioning-baseline-packet.json");
const markdownPath = path.join(outputDir, "provisioning-baseline-report.md");
const svgPath = path.join(outputDir, "summary.svg");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(markdownPath, markdownReport(report));
fs.writeFileSync(svgPath, svgReport(report));

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`Wrote ${svgPath}`);
console.log(`${report.decision}: ${report.counts.blocker} blocker(s), ${report.counts.warning} warning(s), ${report.auditDigest}`);
