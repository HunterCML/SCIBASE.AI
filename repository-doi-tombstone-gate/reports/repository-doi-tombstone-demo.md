# Repository DOI Tombstone Gate Demo

## ready supersession

Decision: ready
Audit digest: e970b44f9d2adec9b6f54c7b9cfad2076da3451154b0dc0666c43e296eb3d549
Findings: 0


## held withdrawal

Decision: hold
Audit digest: 00838a48276b785b1746076534daf7854f199d70cbc5f9d4b47399f6fd291540
Findings: 8

- blocker: SNAPSHOT_HASH_DRIFT - Current repository hash differs from the archived release snapshot hash.
- blocker: REDIRECT_MAP_INCOMPLETE - Redirect map is missing exportBundle.
- blocker: REDIRECT_MAP_INCOMPLETE - Redirect map is missing citationBadge.
- blocker: DOI_REDIRECT_DELETES_TARGET - DOI redirect destination deletes the release target.
- blocker: DOWNSTREAM_CITATION_NOTICE_MISSING - 1 downstream citation(s) exist without a citation notice packet.
- warning: FORK_NOTICE_MISSING - 1 fork(s) exist without a provenance notice packet.
- blocker: REPRODUCIBILITY_FAILURE_UNEXPLAINED - Reproducibility failed without a public failure summary.
- blocker: EXPORT_METADATA_INCOMPLETE - Export metadata is missing schemaOrg.
