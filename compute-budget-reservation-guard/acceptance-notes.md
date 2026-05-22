# Acceptance Notes

## Validation

- `node compute-budget-reservation-guard/test.js`
- `node compute-budget-reservation-guard/demo.js`
- `node --check compute-budget-reservation-guard/index.js`
- `node --check compute-budget-reservation-guard/test.js`
- `node --check compute-budget-reservation-guard/demo.js`
- `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 compute-budget-reservation-guard/demo.mp4`

## Acceptance Coverage

- Clean reservations can be released while recognizing only completed usage.
- Compute overruns without approval hold revenue recognition.
- Grant restrictions block ineligible commercial AI workloads.
- Expired unused reservations produce finance actions that release budget.
- Restricted data requires DPA or data-use-agreement evidence.
- The output audit digest is deterministic for reviewer replay.
