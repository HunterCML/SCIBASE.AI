# Acceptance Notes

This is a focused implementation for SCIBASE issue #12, not a generic AI-generated content drop. The module stays small so reviewers can inspect the review-freeze workflow, validation rules, and version snapshot behavior without pulling in a full editor stack.

## What Changed

- Added section-level freeze windows for manuscript review and submission prep.
- Added operation handling that blocks direct edits while preserving comments, suggestions, tasks, and notebook checks.
- Added clearance logic for blocking comments, open tasks, unresolved suggestions, and stale notebook outputs.
- Added stable version snapshot export for autosave, history, and audit trails.
- Added focused dependency-free tests and demo data.

## Video Demo

- `demo.mp4` shows the problem, implementation, acceptance behavior, and validation command.
- `demo.svg` provides a static workflow diagram.

## Validation

Run from the repository root:

```powershell
node collab-review-freeze-lane/test.js
node collab-review-freeze-lane/demo.js
```

Expected result: the test prints `collab-review-freeze-lane tests passed`, and the demo prints a freeze clearance packet showing blockers before and after review cleanup.

## Integration Notes

The module is dependency-free and uses plain document state objects so it can be adapted into a collaborative editor service. The next integration step is mapping these operations to SCIBASE editor events and persistence.
