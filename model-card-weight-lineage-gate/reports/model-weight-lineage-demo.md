# Model Card Weight Lineage Gate Demo

## ready materials model

Decision: ready
Audit digest: f14237a6b3f03dc7b4bf1e8a46f2748b9c090ae2dc92bfff3db68d6efa771d98
Findings: 0


## held clinical model

Decision: hold
Audit digest: 800789293a33b63e97878fc780513e821b12c41988af73d1c232effb0a87fe66
Findings: 9

- blocker: MODEL_CARD_INCOMPLETE - Model card is missing limitations.
- blocker: MODEL_CARD_INCOMPLETE - Model card is missing evaluation.
- blocker: MODEL_CARD_INCOMPLETE - Model card is missing license.
- blocker: MODEL_CARD_INCOMPLETE - Model card is missing ethicalConsiderations.
- blocker: TRAINING_DATA_EMBARGO_ACTIVE - restricted-clinical-cohort is embargoed until 2026-06-15T00:00:00Z.
- blocker: RESTRICTED_DATA_DUA_MISSING - restricted-clinical-cohort is restricted but has no data-use agreement evidence.
- blocker: PUBLIC_LICENSE_UNKNOWN - Public model package has an unknown license.
- blocker: MODEL_EMBARGO_ACTIVE - The model package is under embargo until 2026-06-15T00:00:00Z.
- blocker: RERUN_OUTPUT_DRIFT - Rerun output hash does not match the expected output hash.
