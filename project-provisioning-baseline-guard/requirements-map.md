# Requirements Map

Issue #11 asks for User & Project Management features, including secure authentication, user profiles, project workspaces, role-based access, collaboration, and audit trails.

This submission focuses on a distinct project provisioning baseline lane:

- Verifies that the project requester has creation authority, institutional affiliation evidence, ORCID linkage, and fresh MFA.
- Checks required project metadata before a new workspace appears in user project lists.
- Enforces visibility constraints by data classification so restricted projects cannot start public.
- Validates registered project templates and their required launch controls.
- Requires owner and data-steward role coverage for controlled research projects.
- Blocks privileged launch roles for external collaborators.
- Requires data-use agreement evidence before external collaborators can receive restricted data export grants.
- Preserves immutable provisioning audit events and emits deterministic audit digests.
- Produces public reviewer summaries without exposing private collaborator evidence.

The scope intentionally avoids the existing broad RBAC/workspace ledger, privacy access review, member lifecycle/offboarding, institutional recertification, anonymous-review escrow, identity merge/export, data-room consent, researcher profile sync, archive handoff, access-audit anomaly, role delegation, invitation-domain/MFA, funding-attribution, service-token governance, deletion/erasure, break-glass, and visibility-transition submissions.
