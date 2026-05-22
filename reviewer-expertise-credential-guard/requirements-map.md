# Requirements Map

Issue #15 asks for community and user reputation features, including reputation metrics, badges, user profiles, peer review, and trusted reviewer tiers.

This submission focuses on a separate expertise credential lane:

- Validates that reviewer domain claims are declared and backed by evidence.
- Checks method-specific evidence before assigning weighted review reputation.
- Detects stale credentials and routes them to steward refresh.
- Blocks weighted reviews when author, institution, funder, or project conflicts are present.
- Supports anonymous review by emitting redacted public reviewer profiles.
- Produces trusted-reviewer, steward-review, and badge-blocked outcomes.
- Emits deterministic assignment and report digests for reviewer replay.

The scope is intentionally narrow so it does not overlap with generic reputation scoring, leaderboard eligibility, recusal, review civility, endorsement-ring, correction-impact, or badge-renewal submissions.
