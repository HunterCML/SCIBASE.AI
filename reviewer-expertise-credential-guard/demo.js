const fs = require("fs");
const path = require("path");
const { evaluateReviewerExpertiseCredentials } = require("./index");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const packet = {
  now: "2026-06-01T12:00:00Z",
  maxEvidenceAgeDays: 730,
  minimumAcceptedReviews: 3,
  reviewers: [
    {
      id: "reviewer-ada",
      displayName: "Ada Reviewer",
      orcid: "0000-0002-1825-0097",
      institution: "open-science-lab",
      declaredDomains: ["proteomics", "machine-learning"],
      declaredMethods: ["bayesian-modeling", "mass-spectrometry"],
      acceptedReviews: 16,
      evidence: [
        { type: "domain", domains: ["proteomics"], issuedAt: "2026-01-15T00:00:00Z", sourceId: "orcid-work-proteomics" },
        { type: "domain", domains: ["machine-learning"], issuedAt: "2026-02-10T00:00:00Z", sourceId: "grant-ml" },
        { type: "method", methods: ["bayesian-modeling"], issuedAt: "2026-03-01T00:00:00Z", sourceId: "review-method" },
      ],
      conflicts: [],
    },
    {
      id: "reviewer-byron",
      displayName: "Byron Reviewer",
      institution: "northbridge-university",
      declaredDomains: ["materials-science"],
      declaredMethods: ["density-functional-theory"],
      acceptedReviews: 2,
      evidence: [{ type: "domain", domains: ["materials-science"], issuedAt: "2023-01-10T00:00:00Z", sourceId: "publication-old" }],
      conflicts: [{ authorId: "author-lin", type: "recent-coauthor" }],
    },
  ],
  assignments: [
    {
      id: "assign-protein",
      manuscriptId: "ms-protein-forecast",
      projectId: "project-protein",
      reviewerId: "reviewer-ada",
      requiredDomains: ["proteomics", "machine-learning"],
      requiredMethods: ["bayesian-modeling"],
      anonymousMode: true,
      authorIds: ["author-lin"],
      institutions: ["northbridge-university"],
    },
    {
      id: "assign-materials",
      manuscriptId: "ms-materials-benchmark",
      projectId: "project-materials",
      reviewerId: "reviewer-byron",
      requiredDomains: ["materials-science"],
      requiredMethods: ["electron-microscopy"],
      anonymousMode: false,
      authorIds: ["author-lin"],
      institutions: ["northbridge-university"],
    },
  ],
};

const report = evaluateReviewerExpertiseCredentials(packet);
const jsonPath = path.join(outputDir, "reviewer-expertise-credential-report.json");
const markdownPath = path.join(outputDir, "reviewer-expertise-credential-report.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(
  markdownPath,
  [
    "# Reviewer Expertise Credential Guard Demo",
    "",
    `Decision: ${report.decision}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Assignment Decisions",
    "",
    ...report.assignments.map(
      (assignment) =>
        `- ${assignment.assignmentId}: ${assignment.decision}; badge ${assignment.badge}; weight ${assignment.reviewWeight}`,
    ),
    "",
    "## Findings",
    "",
    ...report.assignments.flatMap((assignment) =>
      assignment.findings.map((finding) => `- ${assignment.assignmentId}: ${finding.severity} ${finding.code} - ${finding.message}`),
    ),
    "",
    "## Public Profiles",
    "",
    ...report.assignments.map((assignment) => `- ${assignment.assignmentId}: ${JSON.stringify(assignment.publicProfile)}`),
    "",
  ].join("\n"),
);

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${markdownPath}`);
console.log(`${report.decision}: ${report.counts.findings} finding(s), ${report.auditDigest}`);
