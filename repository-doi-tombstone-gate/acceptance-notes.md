# Acceptance Notes

## Scope

Adds `repository-doi-tombstone-gate`, a dependency-free validator for scientific repository version withdrawal, correction, supersession, DOI tombstones, and citation redirect readiness.

## Local Validation

Run from repository root:

```sh
node repository-doi-tombstone-gate/test.js
node repository-doi-tombstone-gate/demo.js
node --check repository-doi-tombstone-gate/index.js
node --check repository-doi-tombstone-gate/test.js
node --check repository-doi-tombstone-gate/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 repository-doi-tombstone-gate/demo.mp4
git diff --check
```

## Expected Results

- Tests pass with deterministic ready, missing snapshot, missing replacement, missing citation notice, snapshot drift, and digest cases.
- Demo writes JSON and Markdown reviewer packets in `repository-doi-tombstone-gate/reports/`.
- Demo video is H.264 at 1280x720.
- `git diff --check` reports no whitespace errors.
