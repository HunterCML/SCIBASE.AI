# Reviewer Expertise Credential Guard Demo

Decision: steward-intervention-required
Audit digest: 3cb70effca2a0f1e197985e28369161e034e4a246dffcc30ae0ec116c747b820

## Assignment Decisions

- assign-protein: trusted-reviewer-ready; badge trusted-reviewer-eligible; weight 1
- assign-materials: block-assignment; badge badge-blocked; weight 0

## Findings

- assign-materials: blocker REVIEWER_CONFLICT_DETECTED - Reviewer has a recent-coauthor conflict with this manuscript.
- assign-materials: warning DOMAIN_EVIDENCE_STALE - Reviewer evidence for materials-science is older than 730 days.
- assign-materials: warning METHOD_EVIDENCE_GAP - Reviewer does not have current evidence for required method electron-microscopy.
- assign-materials: info REVIEW_HISTORY_LIGHT - Reviewer has a short accepted-review history for trusted badge elevation.

## Public Profiles

- assign-protein: {"reviewerHash":"9f670a60af1c5a0d","expertiseTags":["proteomics","machine-learning","bayesian-modeling","mass-spectrometry"],"expertiseScore":100,"badge":"trusted-reviewer-eligible","identityRedacted":true}
- assign-materials: {"reviewerId":"reviewer-byron","displayName":"Byron Reviewer","expertiseTags":["materials-science","density-functional-theory"],"expertiseScore":30,"badge":"badge-blocked","identityRedacted":false}
