# Acceptance Notes

## Validation

- `node project-provisioning-baseline-guard/test.js`
- `node project-provisioning-baseline-guard/demo.js`
- `node project-provisioning-baseline-guard/render-video.js`
- `node --check project-provisioning-baseline-guard/index.js`
- `node --check project-provisioning-baseline-guard/test.js`
- `node --check project-provisioning-baseline-guard/demo.js`
- `node --check project-provisioning-baseline-guard/render-video.js`
- `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 project-provisioning-baseline-guard/demo.mp4`

## Acceptance Coverage

- A controlled institutional project with fresh requester MFA, verified affiliation, required metadata, template controls, owner and data-steward roles, scoped external collaboration, and audit events can provision cleanly.
- Restricted human-subject projects cannot start with public visibility.
- Missing requester authority and stale MFA block provisioning.
- External restricted-data grants require data-use agreement evidence.
- Missing template controls block workspace creation.
- The output audit digest is deterministic for replay and reviewer comparison.
