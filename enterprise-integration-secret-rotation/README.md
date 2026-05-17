# Enterprise Integration Secret Rotation

This module adds an Enterprise Tooling slice for institutional API and webhook governance. It is intentionally self-contained and synthetic-data-only so reviewers can validate the behavior without credentials, third-party services, or local platform setup.

It covers the issue's enterprise API and webhook requirements by evaluating:

- institutional API clients for stale credentials, unauthorized scopes, owner gaps, expiry, and break-glass misuse
- webhook destinations for signing-secret age, unsafe overlap windows, missing HMAC policy, weak idempotency, dead-letter gaps, and recipient verification
- dashboard-ready risk metrics for admins
- deterministic audit evidence packets suitable for compliance exports

## Local Validation

```sh
node enterprise-integration-secret-rotation/test.js
node enterprise-integration-secret-rotation/demo.js
```

## Demo Evidence

- [demo.mp4](demo.mp4) shows the problem, implementation scope, acceptance behavior, and validation commands.
- [demo.svg](demo.svg) provides a static preview of the admin risk queue.
- [requirements-map.md](requirements-map.md) maps the implementation to issue #19.
- [acceptance-notes.md](acceptance-notes.md) lists the reviewer checks.
