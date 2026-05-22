# Reviewer Expertise Credential Guard

This module adds a focused community reputation guard for trusted reviewer expertise credentials.

It evaluates whether a reviewer should receive weighted assignment credit or trusted-reviewer badge eligibility by checking declared expertise, evidence-backed domains, method credentials, evidence freshness, review history, conflicts of interest, and anonymous-review redaction.

## Run

```sh
node reviewer-expertise-credential-guard/test.js
node reviewer-expertise-credential-guard/demo.js
```

The demo writes JSON and Markdown reviewer artifacts to `reviewer-expertise-credential-guard/reports/`.

## Review Surface

The implementation is dependency-free, uses synthetic data only, and does not call external APIs or read credentials.
