# Requirements Map

| Issue requirement | Implementation |
| --- | --- |
| Entity extraction and linked data | Graph edges reference evidence IDs behind concepts, datasets, protocols, and claims. |
| Knowledge navigation | Edge decisions protect graph search and entity-page recommendations from stale evidence. |
| AI research recommendations | `recommendationAllowed` suppresses risky recommendations and produces replacement guidance. |
| Filters by reproducibility and time | Evidence scoring includes age and failed replication status. |
| Entity pages with aggregated data | `edgeReviews` provide evidence-level reasons and replacement candidates for UI display. |
| Structured intelligence from scattered documents | Review packet digests make freshness decisions auditable and repeatable. |

## Reviewer Checklist

- Run `node knowledge-graph-evidence-freshness/test.js`.
- Run `node knowledge-graph-evidence-freshness/demo.js`.
- Confirm retracted and failed-replication evidence suppress graph recommendations.
- Confirm corrected and stale evidence require review before recommendation.
- Confirm replacement candidates are exposed for entity pages.
