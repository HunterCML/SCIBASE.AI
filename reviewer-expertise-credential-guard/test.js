const assert = require("assert");
const { evaluateReviewerExpertiseCredentials } = require("./index");

function basePacket(overrides = {}) {
  return {
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
        acceptedReviews: 14,
        evidence: [
          { type: "domain", domains: ["proteomics"], issuedAt: "2026-01-15T00:00:00Z", sourceId: "orcid-work-1" },
          { type: "domain", domains: ["machine-learning"], issuedAt: "2026-02-10T00:00:00Z", sourceId: "grant-ml-7" },
          { type: "method", methods: ["bayesian-modeling"], issuedAt: "2026-03-01T00:00:00Z", sourceId: "review-method-4" },
          { type: "method", methods: ["mass-spectrometry"], issuedAt: "2026-03-05T00:00:00Z", sourceId: "publication-ms-2" },
        ],
        conflicts: [],
      },
    ],
    assignments: [
      {
        id: "assign-1",
        manuscriptId: "ms-protein-forecast",
        projectId: "project-protein",
        reviewerId: "reviewer-ada",
        requiredDomains: ["proteomics", "machine-learning"],
        requiredMethods: ["bayesian-modeling"],
        anonymousMode: true,
        authorIds: ["author-lin"],
        institutions: ["northbridge-university"],
      },
    ],
    ...overrides,
  };
}

function testTrustedReviewerEligibleWithCurrentEvidence() {
  const result = evaluateReviewerExpertiseCredentials(basePacket());

  assert.equal(result.decision, "expertise-routing-ready");
  assert.equal(result.assignments[0].decision, "trusted-reviewer-ready");
  assert.equal(result.assignments[0].badge, "trusted-reviewer-eligible");
  assert.equal(result.assignments[0].reviewWeight, 1);
}

function testMissingDomainEvidenceRequiresStewardReview() {
  const packet = basePacket();
  packet.reviewers[0].evidence = packet.reviewers[0].evidence.filter((item) => !item.domains || !item.domains.includes("machine-learning"));
  const result = evaluateReviewerExpertiseCredentials(packet);

  assert.equal(result.decision, "credential-review-needed");
  assert.equal(result.assignments[0].decision, "assign-with-lower-weight");
  assert.ok(result.assignments[0].findings.some((finding) => finding.code === "DOMAIN_EVIDENCE_MISSING"));
}

function testConflictBlocksWeightedReview() {
  const packet = basePacket();
  packet.reviewers[0].conflicts = [{ authorId: "author-lin", type: "recent-coauthor" }];
  const result = evaluateReviewerExpertiseCredentials(packet);

  assert.equal(result.decision, "steward-intervention-required");
  assert.equal(result.assignments[0].decision, "block-assignment");
  assert.equal(result.assignments[0].reviewWeight, 0);
  assert.ok(result.assignments[0].findings.some((finding) => finding.code === "REVIEWER_CONFLICT_DETECTED"));
}

function testStaleEvidenceRequiresRefresh() {
  const packet = basePacket({ now: "2028-06-01T12:00:00Z" });
  const result = evaluateReviewerExpertiseCredentials(packet);

  assert.equal(result.decision, "credential-review-needed");
  assert.ok(result.assignments[0].findings.some((finding) => finding.code === "DOMAIN_EVIDENCE_STALE"));
}

function testAnonymousProfileRedactsIdentity() {
  const result = evaluateReviewerExpertiseCredentials(basePacket());
  const profile = result.assignments[0].publicProfile;

  assert.equal(profile.identityRedacted, true);
  assert.ok(profile.reviewerHash);
  assert.equal(profile.displayName, undefined);
  assert.equal(profile.orcid, undefined);
}

function testDeterministicDigest() {
  const first = evaluateReviewerExpertiseCredentials(basePacket());
  const second = evaluateReviewerExpertiseCredentials(basePacket());
  assert.equal(first.auditDigest, second.auditDigest);
}

testTrustedReviewerEligibleWithCurrentEvidence();
testMissingDomainEvidenceRequiresStewardReview();
testConflictBlocksWeightedReview();
testStaleEvidenceRequiresRefresh();
testAnonymousProfileRedactsIdentity();
testDeterministicDigest();

console.log("reviewer-expertise-credential-guard tests passed");
