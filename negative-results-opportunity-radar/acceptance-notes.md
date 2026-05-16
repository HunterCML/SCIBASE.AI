# Acceptance Notes

This is a focused implementation for SCIBASE issue #16, not a generic AI-generated content drop. The module is small because the bounty asks for a specific AI research-assistant capability that can be reviewed independently before integration.

## What Changed

- Added signal extraction for negative results, limitations, and failed replications.
- Added evidence clustering and opportunity ranking by topic, method, lab fit, and user interest.
- Added reproducibility flags and assistant packets that include peer-review prompts, citation queries, and next-step recommendations.
- Added focused dependency-free tests and demo data.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static architecture and workflow diagram.

## Validation

Run from the repository root:

```powershell
node negative-results-opportunity-radar/test.js
node negative-results-opportunity-radar/demo.js
```

Expected result: the test prints `negative-results-opportunity-radar tests passed`, and the demo prints a ranked opportunity packet with evidence, reproducibility flags, citation queries, and peer-review prompts.

## Integration Notes

The module is intentionally dependency-free so maintainers can lift it into a larger search or assistant service. The next integration step is replacing the sample paper objects with SCIBASE paper ingestion output.
