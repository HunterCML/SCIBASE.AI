"use strict";

const {
  buildAssistantPacket,
  rankOpportunities
} = require("./index");

const papers = [
  {
    id: "trial-101",
    title: "Neuroinflammation classifier pilot",
    topics: ["neuroinflammation", "biomarkers"],
    methods: ["proteomics", "cohort-validation"],
    limitations: ["study excluded early-stage patients"],
    negativeResults: ["blood panel failed to separate mild disease"],
    failedReplications: []
  },
  {
    id: "trial-118",
    title: "External proteomics replication study",
    topics: ["neuroinflammation", "biomarkers"],
    methods: ["proteomics"],
    limitations: ["assay drift was not modeled across sites"],
    negativeResults: [],
    failedReplications: ["published classifier failed on two external cohorts"]
  },
  {
    id: "screen-22",
    title: "Mouse model intervention screen",
    topics: ["neuroinflammation"],
    methods: ["animal-model"],
    limitations: ["translation to human cohorts is uncertain"],
    negativeResults: ["late intervention showed no measurable rescue"],
    failedReplications: []
  }
];

const opportunities = rankOpportunities({
  papers,
  labCapabilities: ["proteomics", "cohort-validation"],
  userInterests: ["neuroinflammation"],
  minimumScore: 20
});

console.log(JSON.stringify({
  opportunities,
  assistantPacket: buildAssistantPacket({
    projectId: "neuro-gap-review",
    opportunities
  })
}, null, 2));

