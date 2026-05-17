# Acceptance Notes

## What This Adds

The `artifact-package-integrity-gate` module gives SCIBASE a deterministic validation layer for hosted scientific data and code packages before they are exposed through persistent links, DOI metadata, reviewer packets, or rerun buttons.

## Why It Is Distinct

This is not a broad storage sketch or another simple FAIR manifest. It focuses on the package boundary where reviewers need to know whether every artifact is hashed, previewable, licensed, metadata-complete, access-controlled, and connected to a pinned executable environment.

## Reviewer Checks

1. Run `node artifact-package-integrity-gate/test.js`.
2. Run `node artifact-package-integrity-gate/demo.js`.
3. Confirm the passing package reports `packageReady: true`.
4. Confirm the broken package test catches missing sha256 hashes, incomplete DataCite fields, unpinned runtimes, and commands that reference missing hosted inputs.
5. Inspect `demo.svg` or `demo.mp4` for the reviewer-facing workflow summary.

## Payout Conditions Covered

- Issue #14 has a live Algora bounty route.
- The PR body includes `/claim #14`.
- The module includes a short demo video artifact.
- The implementation is dependency-free and locally verifiable.
