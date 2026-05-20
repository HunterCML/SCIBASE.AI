"use strict";

const crypto = require("node:crypto");

const DOMAIN_RULES = {
  clinical: {
    keywords: ["patient", "participants", "clinical", "trial", "cohort", "randomized"],
    requiredEvidence: ["ethics", "sample-size", "randomization", "statistical-plan", "data-availability"],
    citationTopics: ["CONSORT reporting", "clinical trial registration", "data sharing statement"],
  },
  computational: {
    keywords: ["model", "algorithm", "notebook", "container", "pipeline", "repository", "simulation"],
    requiredEvidence: ["code-availability", "environment", "dataset-version", "statistical-plan"],
    citationTopics: ["software citation", "dataset versioning", "containerized reproducibility"],
  },
  wetlab: {
    keywords: ["assay", "reagent", "antibody", "cell line", "western blot", "microscopy"],
    requiredEvidence: ["reagent-identifiers", "calibration", "replicates", "ethics", "data-availability"],
    citationTopics: ["RRID reagent identifiers", "assay validation", "minimum information checklist"],
  },
};

const EVIDENCE_CHECKS = {
  ethics: {
    label: "Ethics approval",
    patterns: [/irb/i, /ethics committee/i, /informed consent/i, /protocol approval/i],
  },
  "sample-size": {
    label: "Sample size and cohort definition",
    patterns: [/\bn\s*=\s*\d+/i, /\b\d+\s+(participants|patients|samples|specimens)\b/i, /sample size/i],
  },
  randomization: {
    label: "Randomization or allocation method",
    patterns: [/randomi[sz]ed/i, /allocation/i, /blinded/i, /block random/i],
  },
  "statistical-plan": {
    label: "Statistical analysis plan",
    patterns: [/confidence interval/i, /\bci\b/i, /statistical analysis/i, /multiple comparison/i, /\bp\s*[<=>]/i],
  },
  "data-availability": {
    label: "Data availability",
    patterns: [/data (are|is) available/i, /repository/i, /accession/i, /zenodo/i, /figshare/i],
  },
  "code-availability": {
    label: "Code availability",
    patterns: [/source code/i, /github/i, /gitlab/i, /software repository/i, /notebook/i],
  },
  environment: {
    label: "Execution environment",
    patterns: [/docker/i, /container/i, /conda/i, /runtime/i, /python \d/i, /node \d/i],
  },
  "dataset-version": {
    label: "Dataset version",
    patterns: [/dataset version/i, /accession/i, /doi/i, /snapshot/i, /release tag/i],
  },
  "reagent-identifiers": {
    label: "Reagent identifiers",
    patterns: [/rrid/i, /catalog/i, /lot number/i, /clone/i],
  },
  calibration: {
    label: "Instrument calibration",
    patterns: [/calibrat/i, /quality control/i, /control sample/i],
  },
  replicates: {
    label: "Replicate design",
    patterns: [/biological replicate/i, /technical replicate/i, /replicates/i],
  },
};

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

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function inferDomain(documentText) {
  const text = documentText.toLowerCase();
  const scored = Object.entries(DOMAIN_RULES).map(([domain, config]) => ({
    domain,
    hits: config.keywords.filter((keyword) => text.includes(keyword)).length,
  }));
  scored.sort((a, b) => b.hits - a.hits || a.domain.localeCompare(b.domain));
  return scored[0].hits > 0 ? scored[0].domain : "computational";
}

function hasEvidence(text, evidenceCode) {
  const check = EVIDENCE_CHECKS[evidenceCode];
  if (!check) return false;
  return splitSentences(text).some(
    (sentence) =>
      !isNegatedEvidenceSentence(sentence) && check.patterns.some((pattern) => pattern.test(sentence)),
  );
}

function findEvidenceSpan(sentences, evidenceCode) {
  const check = EVIDENCE_CHECKS[evidenceCode];
  if (!check) return null;
  return (
    sentences.find(
      (sentence) =>
        !isNegatedEvidenceSentence(sentence) && check.patterns.some((pattern) => pattern.test(sentence)),
    ) || null
  );
}

function isNegatedEvidenceSentence(sentence) {
  return /\b(no|not|without|omit|omits|missing|absent|unavailable|not reported|do not describe)\b/i.test(sentence);
}

function makeCitation(topic, style = "apa") {
  const title = `${topic} guidance`;
  if (style === "nature") {
    return `${topic} working group. ${title}. SciBase Methods Standards (2026).`;
  }
  if (style === "mla") {
    return `${topic} working group. "${title}." SciBase Methods Standards, 2026.`;
  }
  return `${topic} working group. (2026). ${title}. SciBase Methods Standards.`;
}

function summarizePaper(input, mode = "abstract") {
  const title = normalizeText(input.title) || "Untitled manuscript";
  const abstractSentences = splitSentences(input.abstract);
  const methodSentences = splitSentences(input.methods);
  const resultSentences = splitSentences(input.results);
  const keyFinding = normalizeText(input.keyFinding) || resultSentences[0] || abstractSentences[0] || "Key finding not stated.";
  const methodAnchor = methodSentences[0] || "Methods section needs a clearer design description.";

  if (mode === "layperson") {
    return {
      mode,
      title,
      summary: `${title} studies whether the stated method can support the main finding. The main result is: ${keyFinding}`,
      nextSteps: ["Add plain-language limits", "Name the strongest method evidence", "Explain what would change the conclusion"],
      evidenceSpans: [methodAnchor, keyFinding].filter(Boolean),
    };
  }

  if (mode === "executive") {
    return {
      mode,
      title,
      summary: `${title}: ${keyFinding}`,
      nextSteps: ["Resolve method blockers", "Attach data/code availability", "Add citation insertions before review"],
      evidenceSpans: [methodAnchor, keyFinding].filter(Boolean),
    };
  }

  return {
    mode,
    title,
    summary: `${title}. ${methodAnchor} ${keyFinding}`,
    nextSteps: ["Check required method evidence", "Verify statistical reporting", "Route unresolved redlines to peer review"],
    evidenceSpans: [methodAnchor, keyFinding].filter(Boolean),
  };
}

function buildCitationRecommendations(domain, missingEvidence, style) {
  const topics = new Set(DOMAIN_RULES[domain].citationTopics);
  for (const code of missingEvidence) {
    if (code === "data-availability") topics.add("FAIR data availability");
    if (code === "code-availability") topics.add("software citation");
    if (code === "statistical-plan") topics.add("transparent statistical reporting");
    if (code === "reagent-identifiers") topics.add("RRID reagent identifiers");
    if (code === "environment") topics.add("containerized reproducibility");
  }

  return Array.from(topics).map((topic) => ({
    topic,
    style,
    formattedReference: makeCitation(topic, style),
    insertionHint: `Insert near the first methods paragraph that discusses ${topic.toLowerCase()}.`,
    confidence: missingEvidence.length === 0 ? "medium" : "high",
  }));
}

function evaluateMethodReadiness(input, options = {}) {
  const style = options.citationStyle || "apa";
  const documentText = [
    input.title,
    input.abstract,
    input.methods,
    input.results,
    input.dataAvailability,
    input.ethicsStatement,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
  const domain = options.domain || inferDomain(documentText);
  const sentences = splitSentences(documentText);
  const requiredEvidence = DOMAIN_RULES[domain].requiredEvidence;

  const evidence = requiredEvidence.map((code) => ({
    code,
    label: EVIDENCE_CHECKS[code].label,
    present: hasEvidence(documentText, code),
    span: findEvidenceSpan(sentences, code),
  }));

  const missingEvidence = evidence.filter((item) => !item.present).map((item) => item.code);
  const redlines = [];

  for (const item of evidence) {
    if (!item.present) {
      redlines.push({
        severity: "blocker",
        code: `missing-${item.code}`,
        message: `${item.label} is missing or not machine-detectable in the draft.`,
      });
    }
  }

  if (/\bp\s*[<=>]\s*0?\.\d+/i.test(documentText) && !/confidence interval|\bci\b/i.test(documentText)) {
    redlines.push({
      severity: "warning",
      code: "p-value-without-interval",
      message: "A p-value is reported without a confidence interval or comparable uncertainty statement.",
    });
  }

  if (!/limitation|caveat|uncertain|future work/i.test(documentText)) {
    redlines.push({
      severity: "warning",
      code: "missing-limitations",
      message: "The draft does not expose limitations or caveats for reviewer triage.",
    });
  }

  const readinessScore = Math.max(
    0,
    100 - missingEvidence.length * 18 - redlines.filter((item) => item.severity === "warning").length * 6,
  );

  const insertionTasks = redlines.map((redline) => ({
    target: redline.code.startsWith("missing-") ? "methods" : "discussion",
    action: redline.severity === "blocker" ? "add required evidence" : "tighten reporting",
    redlineCode: redline.code,
  }));

  const citationRecommendations = buildCitationRecommendations(domain, missingEvidence, style);
  const summaryModes = ["abstract", "executive", "layperson"].map((mode) => summarizePaper(input, mode));

  const result = {
    domain,
    readinessScore,
    readyForPreReview: !redlines.some((redline) => redline.severity === "blocker"),
    summaryModes,
    peerReviewDiagnostics: {
      requiredEvidence: evidence,
      redlines,
      reviewerTemplate: `${domain} methods reproducibility review`,
      reviewerQuestions: [
        "Can a reviewer reproduce the design from the methods alone?",
        "Are data/code/materials access constraints explicit?",
        "Are uncertainty and limitations visible before submission?",
      ],
    },
    citationRecommendations,
    insertionTasks,
  };

  return {
    ...result,
    auditDigest: stableDigest({
      domain,
      readinessScore,
      missingEvidence,
      redlines: redlines.map((redline) => redline.code),
      citationTopics: citationRecommendations.map((citation) => citation.topic),
    }),
  };
}

module.exports = {
  DOMAIN_RULES,
  EVIDENCE_CHECKS,
  evaluateMethodReadiness,
  inferDomain,
  makeCitation,
  splitSentences,
  stableDigest,
  summarizePaper,
};
