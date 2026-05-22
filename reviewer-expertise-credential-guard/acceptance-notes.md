# Acceptance Notes

## Validation

- `node reviewer-expertise-credential-guard/test.js`
- `node reviewer-expertise-credential-guard/demo.js`
- `node --check reviewer-expertise-credential-guard/index.js`
- `node --check reviewer-expertise-credential-guard/test.js`
- `node --check reviewer-expertise-credential-guard/demo.js`
- `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reviewer-expertise-credential-guard/demo.mp4`

## Acceptance Coverage

- Current domain and method evidence can make a reviewer trusted-reviewer eligible.
- Missing domain evidence lowers review weight and requires steward review.
- Conflicts block weighted assignment credit.
- Stale credentials require refresh before trusted badge elevation.
- Anonymous review mode redacts display name and ORCID from public profiles.
- The output audit digest is deterministic for reviewer replay.
