"use strict";

const assert = require("assert");
const {
  buildAmendmentLedger,
  classifyAmendment,
  digest
} = require("./index");

const challenge = {
  id: "biomarker-bounty-2026",
  title: "Identify early-stage biomarker panel",
  finalDeadline: "2026-06-30T23:59:59Z",
  payoutSchedule: "winner_takes_70_runner_up_30",
  ipTerms: "solver_retains_until_paid",
  privateDataRequired: false
};

const materialAmendment = {
  id: "amend-2",
  sponsorId: "pharma-sponsor",
  requestedAt: "2026-06-10T10:00:00Z",
  reason: "sponsor added a second validation cohort",
  changes: {
    deliverablesAdded: ["external-cohort-validation-report"],
    evaluationCriteriaAdded: ["cross-site assay drift"],
    rubricWeightDelta: 15,
    deadlineMovedTo: "2026-06-20T23:59:59Z",
    ipTerms: "ip_transfer_on_acceptance"
  }
};

const typoAmendment = {
  id: "amend-1",
  sponsorId: "pharma-sponsor",
  requestedAt: "2026-06-01T10:00:00Z",
  reason: "copy edit",
  changes: {
    descriptionClarification: "fixed typo in data dictionary label"
  }
};

const teams = [
  {
    teamId: "lab-alpha",
    consentedAmendmentIds: ["amend-2"]
  },
  {
    teamId: "student-consortium",
    consentedAmendmentIds: []
  },
  {
    teamId: "new-solver",
    consentedAmendmentIds: []
  }
];

const submissions = [
  {
    id: "sub-alpha-1",
    teamId: "lab-alpha",
    submittedAt: "2026-06-08T08:00:00Z",
    artifactHashes: ["paper:aaa", "notebook:bbb"]
  },
  {
    id: "sub-student-1",
    teamId: "student-consortium",
    submittedAt: "2026-06-09T11:00:00Z",
    artifactHashes: ["paper:ccc", "notebook:ddd"]
  },
  {
    id: "sub-new-1",
    teamId: "new-solver",
    submittedAt: "2026-06-14T11:00:00Z",
    artifactHashes: ["paper:eee"]
  }
];

const material = classifyAmendment(materialAmendment, challenge);
assert.strictEqual(material.requiresReconsent, true);
assert.ok(material.materialChanges.includes("deliverables_added"));
assert.ok(material.materialChanges.includes("deadline_shortened"));
assert.ok(material.materialChanges.includes("ip_terms_changed"));
assert.ok(material.materialityScore >= 80);

const typo = classifyAmendment(typoAmendment, challenge);
assert.strictEqual(typo.requiresReconsent, false);
assert.deepStrictEqual(typo.materialChanges, []);

const ledger = buildAmendmentLedger({
  challenge,
  amendments: [typoAmendment, materialAmendment],
  teams,
  submissions
});

const studentStatus = ledger.teamStatuses.find((status) =>
  status.teamId === "student-consortium" && status.amendmentId === "amend-2"
);
assert.strictEqual(studentStatus.consentRequired, true);
assert.strictEqual(studentStatus.consentReceived, false);
assert.strictEqual(studentStatus.protectedWithdrawal, true);
assert.strictEqual(studentStatus.evidenceLock.lockedCount, 1);

const labStatus = ledger.teamStatuses.find((status) =>
  status.teamId === "lab-alpha" && status.amendmentId === "amend-2"
);
assert.strictEqual(labStatus.status, "accepted_changed_terms");
assert.strictEqual(labStatus.payoutHold, false);

const newSolverStatus = ledger.teamStatuses.find((status) =>
  status.teamId === "new-solver" && status.amendmentId === "amend-2"
);
assert.strictEqual(newSolverStatus.status, "awaiting_consent");
assert.strictEqual(newSolverStatus.evidenceLock.lockedCount, 0);

assert.deepStrictEqual(ledger.arbitrationPacket.safeToContinueTeamIds, ["lab-alpha"]);
assert.deepStrictEqual(ledger.arbitrationPacket.protectedWithdrawalTeamIds, ["student-consortium"]);
assert.ok(ledger.arbitrationPacket.blockedAwardTeamIds.includes("new-solver"));
assert.strictEqual(digest(ledger.arbitrationPacket).length, 64);

console.log("challenge-amendment-consent-ledger tests passed");
