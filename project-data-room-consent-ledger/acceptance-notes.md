# Acceptance Notes

Reviewer checks:

1. Run `node project-data-room-consent-ledger/test.js`.
2. Run `node project-data-room-consent-ledger/demo.js`.
3. Confirm the valid scenario approves two grants, verifies both identities, and emits SHA-256 audit/export digests.
4. Confirm the broken scenario holds unsafe access when MFA, ORCID, expiry, sponsor, role permission, and restricted-data consent evidence are missing.
5. Confirm anonymous review identity displays the pseudonym while still requiring escrow evidence.

The module uses only Node built-ins and synthetic inputs. It does not call live identity providers, inspect user secrets, or store real participant data.
