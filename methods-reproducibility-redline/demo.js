"use strict";

const { evaluateMethodReadiness } = require("./index");

const draft = {
  title: "Containerized literature triage for rare disease teams",
  abstract:
    "We evaluate a computational triage model that ranks rare disease papers for curator review.",
  methods:
    "The source code is available in a GitHub repository. The dataset version is RareLit snapshot 2026.04. The Python 3.12 runtime is captured in a Docker image. Statistical analysis reports bootstrap confidence intervals and limitations include English-language indexing bias.",
  results:
    "The model reduced curator screening load by 22% while preserving recall for known benchmark papers.",
  keyFinding: "A reproducible triage pipeline can reduce curator review load without hiding evidence gaps.",
};

const result = evaluateMethodReadiness(draft, { citationStyle: "apa" });

console.log("Methods reproducibility redline demo");
console.log(JSON.stringify(
  {
    domain: result.domain,
    readinessScore: result.readinessScore,
    readyForPreReview: result.readyForPreReview,
    redlines: result.peerReviewDiagnostics.redlines,
    citationTopics: result.citationRecommendations.map((citation) => citation.topic),
    auditDigest: result.auditDigest,
  },
  null,
  2,
));
