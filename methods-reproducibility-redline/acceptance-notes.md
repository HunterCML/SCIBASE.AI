# Acceptance Notes

Reviewer checks:

1. Run `node methods-reproducibility-redline/test.js`.
2. Run `node methods-reproducibility-redline/demo.js`.
3. Confirm complete clinical drafts pass without blockers.
4. Confirm risky computational drafts produce method, code, environment, and uncertainty redlines.
5. Confirm citation recommendations include formatted references and insertion hints.
6. Confirm `auditDigest` is stable for the same input.

The implementation is dependency-free and uses synthetic manuscript examples only, so it can be reviewed without accounts, external corpora, or AI service keys.
