# Requirements Map

Issue #11 asks for user and project management covering identity, researcher profiles, project spaces, permissions, and auditability. This module implements a focused data-room consent ledger inside that scope.

## Authentication and Identity

- `evaluateIdentity` verifies institutional, external, and anonymous-review identity evidence.
- Institutional identities require email and SAML evidence.
- External collaborators require email and ORCID evidence.
- Anonymous review mode requires an anonymous profile and identity-escrow evidence.
- MFA is enforced by default before access can become ready.

## Researcher Profiles

- Identity results preserve public, private, and anonymous display modes.
- Anonymous review mode returns the configured pseudonym instead of the legal name.
- Expired training evidence produces review findings before project access is trusted.

## Project Spaces

- Project records model scientific workspaces with visibility, title, and funding source.
- Object records model project documents, restricted datasets, and discussion or review threads.

## Permissions and Access Control

- Role permissions are deterministic for owner, admin, contributor, reviewer, and viewer.
- Object-level grants evaluate requested actions against the role policy.
- External collaborators entering institutional-only projects require an institutional sponsor.
- External collaborator grants require an expiry date.
- Restricted dataset download requires a consent record with IRB protocol, data-use agreement, and export policy.

## Audit Log

- `buildAuditChain` creates deterministic chained hashes for project and grant events.
- `exportPacket` summarizes approved grant digests, held grant IDs, and the final audit root for institutional review.
