# Project Data Room Consent Ledger

This module adds a User and Project Management slice for project data-room access, object-level permissions, and export consent. It is self-contained, dependency-free, and synthetic-data-only so reviewers can validate it without accounts, SAML credentials, ORCID tokens, or a running platform.

It covers issue #11 by evaluating:

- institutional, external, and anonymous-review identity evidence
- MFA, ORCID, SAML, and identity-escrow requirements before access is granted
- project visibility and external collaborator sponsor requirements
- role-based and object-level permissions for documents, datasets, and review threads
- restricted dataset download consent with IRB, data-use agreement, and export policy evidence
- immutable audit-chain and export-packet digests for reviewer and institutional records

This is not another broad RBAC demo, offboarding workflow, identity merge, or anonymous-review escrow implementation. The focus is the handoff point where project managers must prove that a collaborator may enter a research data room and export a restricted object.

## Local Validation

```sh
node project-data-room-consent-ledger/test.js
node project-data-room-consent-ledger/demo.js
```

## Demo Evidence

- [demo.mp4](demo.mp4) shows the problem, implementation scope, access decisions, and validation commands.
- [demo.svg](demo.svg) provides a static reviewer dashboard preview.
- [requirements-map.md](requirements-map.md) maps the implementation to issue #11.
- [acceptance-notes.md](acceptance-notes.md) lists the reviewer checks.
