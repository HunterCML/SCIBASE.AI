"use strict";

const crypto = require("crypto");

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stable(value[key]);
      return result;
    }, {});
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function normalizeList(values) {
  return [...new Set((values || [])
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean))].sort();
}

function normalizePaper(paper) {
  if (!paper || !paper.id || !paper.title) {
    throw new Error("Paper requires id and title");
  }

  return {
    id: String(paper.id),
    title: String(paper.title),
    year: paper.year || null,
    topics: normalizeList(paper.topics),
    methods: normalizeList(paper.methods),
    limitations: normalizeList(paper.limitations),
    negativeResults: normalizeList(paper.negativeResults),
    failedReplications: normalizeList(paper.failedReplications),
    citations: paper.citations || []
  };
}

function signalRecord(paper, kind, text) {
  return {
    paperId: paper.id,
    title: paper.title,
    year: paper.year,
    kind,
    text,
    topics: paper.topics,
    methods: paper.methods,
    evidenceDigest: digest({
      paperId: paper.id,
      kind,
      text
    })
  };
}

function extractSignals(paperInput) {
  const paper = normalizePaper(paperInput);
  return [
    ...paper.limitations.map((text) => signalRecord(paper, "limitation", text)),
    ...paper.negativeResults.map((text) => signalRecord(paper, "negative_result", text)),
    ...paper.failedReplications.map((text) => signalRecord(paper, "failed_replication", text))
  ];
}

function clusterKey(topic, method) {
  return `${topic || "general"}::${method || "method-open"}`;
}

function addToCluster(clusters, topic, method, signal) {
  const key = clusterKey(topic, method);
  if (!clusters.has(key)) {
    clusters.set(key, {
      key,
      topic: topic || "general",
      method: method || "method-open",
      signals: []
    });
  }
  clusters.get(key).signals.push(signal);
}

function buildClusters(signals) {
  const clusters = new Map();

  for (const signal of signals) {
    const topics = signal.topics.length > 0 ? signal.topics : ["general"];
    const methods = signal.methods.length > 0 ? signal.methods : ["method-open"];
    for (const topic of topics) {
      for (const method of methods) {
        addToCluster(clusters, topic, method, signal);
      }
    }
  }

  return [...clusters.values()];
}

function countKinds(signals) {
  return signals.reduce((counts, signal) => {
    counts[signal.kind] = (counts[signal.kind] || 0) + 1;
    return counts;
  }, {});
}

function opportunityScore(cluster, labCapabilities, userInterests) {
  const counts = countKinds(cluster.signals);
  const uniquePaperCount = new Set(cluster.signals.map((signal) => signal.paperId)).size;
  const capabilityMatches = [cluster.topic, cluster.method].filter((value) => labCapabilities.has(value)).length;
  const interestMatches = [cluster.topic, cluster.method].filter((value) => userInterests.has(value)).length;
  const unsupportedPenalty = capabilityMatches === 0 ? 12 : 0;

  return (
    uniquePaperCount * 10 +
    (counts.limitation || 0) * 8 +
    (counts.negative_result || 0) * 16 +
    (counts.failed_replication || 0) * 22 +
    capabilityMatches * 12 +
    interestMatches * 9 -
    unsupportedPenalty
  );
}

function recommendedActions(cluster) {
  const kinds = new Set(cluster.signals.map((signal) => signal.kind));
  const actions = [];

  if (kinds.has("failed_replication")) {
    actions.push("Design a focused replication or adversarial validation run.");
  }
  if (kinds.has("negative_result")) {
    actions.push("Convert the negative result into a bounded hypothesis search.");
  }
  if (kinds.has("limitation")) {
    actions.push("Target the stated limitation with a smaller controlled follow-up.");
  }
  actions.push(`Search related citations for ${cluster.topic} using ${cluster.method}.`);

  return actions;
}

function reproducibilityFlags(cluster) {
  const flags = [];
  if (cluster.signals.some((signal) => signal.kind === "failed_replication")) {
    flags.push("failed_replication_evidence");
  }
  if (new Set(cluster.signals.map((signal) => signal.paperId)).size > 1) {
    flags.push("multi_paper_signal");
  }
  if (cluster.signals.some((signal) => signal.kind === "negative_result")) {
    flags.push("negative_result_context_required");
  }
  return flags;
}

function rankOpportunities(input) {
  const labCapabilities = new Set(normalizeList(input.labCapabilities));
  const userInterests = new Set(normalizeList(input.userInterests));
  const signals = (input.papers || []).flatMap(extractSignals);

  return buildClusters(signals)
    .map((cluster) => {
      const score = opportunityScore(cluster, labCapabilities, userInterests);
      return {
        id: `opportunity-${digest(cluster.key).slice(0, 10)}`,
        focus: `${cluster.topic} + ${cluster.method}`,
        topic: cluster.topic,
        method: cluster.method,
        score,
        confidence: score >= 70 ? "high" : score >= 42 ? "medium" : "low",
        evidenceCount: cluster.signals.length,
        evidence: cluster.signals
          .sort((a, b) => a.paperId.localeCompare(b.paperId) || a.kind.localeCompare(b.kind))
          .slice(0, input.evidenceLimit || 6),
        recommendedActions: recommendedActions(cluster),
        reproducibilityFlags: reproducibilityFlags(cluster)
      };
    })
    .filter((opportunity) => opportunity.score >= (input.minimumScore || 20))
    .sort((a, b) => b.score - a.score || a.focus.localeCompare(b.focus));
}

function buildAssistantPacket(input) {
  const opportunities = input.opportunities || [];
  const top = opportunities[0] || null;

  return {
    projectId: input.projectId || "research-project",
    generatedFrom: "negative-results-opportunity-radar",
    rankedOpportunityCount: opportunities.length,
    topRecommendation: top ? {
      id: top.id,
      focus: top.focus,
      score: top.score,
      confidence: top.confidence
    } : null,
    peerReviewPrompts: top ? [
      `Ask whether the manuscript discusses negative or failed evidence around ${top.focus}.`,
      `Check whether the proposed study distinguishes novelty from known limitations in ${top.topic}.`
    ] : [],
    citationQueries: opportunities.slice(0, 3).map((opportunity) => {
      return `${opportunity.topic} ${opportunity.method} negative result failed replication limitation`;
    }),
    reproducibilityChecklist: top ? [
      `Trace evidence papers: ${top.evidence.map((item) => item.paperId).join(", ")}`,
      `Confirm capability match for ${top.method}.`,
      `Plan a preregistered validation for ${top.topic}.`
    ] : []
  };
}

module.exports = {
  buildAssistantPacket,
  digest,
  extractSignals,
  rankOpportunities
};

