# Acceptance Notes

This is a focused implementation for SCIBASE issue #10, not a generic AI-generated content drop. The module targets one reviewable repository-versioning problem: preserving citation, license, hash, and reproducibility evidence when a fork is merged back into a research project.

## What Changed

- Added deterministic repository manifests for manuscripts, datasets, code, result tables, and environment descriptors.
- Added fork attribution checks so derivative repositories retain parent project citation links.
- Added license compatibility and reproducibility checks before accepting a publishable merge.
- Added component hash diffs with semantic version recommendations.
- Added exportable citation impact attestations for downstream DOI, API, or archive systems.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static storyboard of the merge gate.

## Validation

Run from the repository root:

```powershell
node repository-citation-impact-gate/test.js
node repository-citation-impact-gate/demo.js
```

Expected result: the test prints `repository-citation-impact-gate tests passed`, and the demo prints release decisions, version recommendations, component diffs, and an export attestation.

## Integration Notes

The module is dependency-free and uses plain manifest objects so maintainers can adapt it to a SCIBASE repository model or API. The next integration step is replacing the sample manifests with repository metadata loaded from project storage.
