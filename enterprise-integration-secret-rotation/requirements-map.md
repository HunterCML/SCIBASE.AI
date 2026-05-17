# Requirements Map

Issue #19 asks for Enterprise Tooling around admin dashboards, APIs and webhooks, and export pipelines. This slice focuses on a concrete institutional security control needed before those integrations can safely run at scale.

| Issue area | Implementation |
| --- | --- |
| Admin dashboards | `dashboard` summarizes monitored systems, API clients, webhook destinations, high-risk items, critical items, compliance score, and top next actions. |
| API integrations | API client findings check DSpace, Canvas, HRIS, ORCID, and repository-style clients for owner accountability, least-privilege scopes, expiry, inactivity, and rotation age. |
| Webhook support | Webhook findings validate HMAC signing, HTTPS transport, secret rotation age, overlap windows, idempotency policy, dead-letter queues, recipient verification, and allowed event types. |
| Compliance tracking | The evidence packet emits stable digests, requirement coverage, high-risk counts, and source/finding hashes for audit export. |
| Export readiness | The module produces deterministic JSON output that can be attached to institutional compliance exports or admin review packets. |

## Acceptance Coverage

- Flags expired API credentials and unauthorized enterprise scopes.
- Identifies unsafe webhook secret overlap windows.
- Produces actionable risk ordering for admins.
- Keeps low-risk integrations in monitor state.
- Emits stable SHA-256 evidence digests for compliance packets.
