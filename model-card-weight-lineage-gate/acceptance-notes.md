# Acceptance Notes

## Scope

Adds `model-card-weight-lineage-gate`, a dependency-free validator for model-card and trained-weight release readiness inside Scientific/Engineering Data & Code Hosting.

## Local Validation

Run from repository root:

```sh
node model-card-weight-lineage-gate/test.js
node model-card-weight-lineage-gate/demo.js
node --check model-card-weight-lineage-gate/index.js
node --check model-card-weight-lineage-gate/test.js
node --check model-card-weight-lineage-gate/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 model-card-weight-lineage-gate/demo.mp4
git diff --check
```

## Expected Results

- Tests pass with deterministic ready, hold, embargo, drift, and rerun mismatch cases.
- Demo writes JSON and Markdown reviewer packets in `model-card-weight-lineage-gate/reports/`.
- Demo video is H.264 at 1280x720.
- `git diff --check` reports no whitespace errors.
