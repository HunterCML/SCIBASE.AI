# Notebook Kernel Lease Guard Demo

Decision: hold-execution
Audit digest: 582e7bc4f37e4f9501eec3d3124ade4f7462eeb229ba7aa2b84b4ed9e752f415

## Findings

- warning: KERNEL_HANDOFF_PENDING - Kernel handoff is requested but not accepted.
- warning: KERNEL_MEMORY_LIMIT_EXCEEDED - Kernel memory usage exceeds the lease limit.
- blocker: KERNEL_LEASE_EXPIRED - Kernel lease has expired.
- warning: CELL_OUTPUT_STALE_AFTER_RESTART - Cell output was produced before the current kernel restart.
- warning: CELL_SOURCE_CHANGED_AFTER_OUTPUT - Cell source changed after the last recorded output.
- blocker: PUBLICATION_CELL_HAS_UNRESOLVED_COMMENTS - Publication-ready notebook cell still has unresolved comments.
- blocker: CELL_EXECUTION_BLOCKED_BY_LEASE - Cell execution is blocked because its kernel lease is missing or expired.

## Execution Queue

