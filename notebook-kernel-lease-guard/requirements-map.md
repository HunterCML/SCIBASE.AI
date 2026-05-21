# Requirements Map

Issue #12 asks for a real-time collaborative scientific editor with Jupyter notebook integration, live collaboration, comments, locks, autosave, and version safety.

| Issue requirement | Implementation coverage |
| --- | --- |
| Embedded Jupyter notebooks | Evaluates notebook cells linked to project kernels. |
| Real-time rendering and execution | Builds an execution queue only for cells with valid leases. |
| Kernel management per project or user session | Requires owner-scoped kernel leases with expiry, handoff state, and resource limits. |
| Inline cell commenting and annotation | Blocks publication-ready cells with unresolved inline comments. |
| Live collaboration and controlled locks | Detects pending kernel handoffs and inactive lease owners. |
| Version history and autosave | Flags source changes after output and stale outputs after kernel restarts before publication. |

This slice is distinct from existing submissions because it focuses on notebook kernel ownership and execution safety, not autosave recovery, review freeze lanes, round-trip formatting, task dependencies, decision ledgers, figure/table review, equation references, or broad collaborative editor foundations.
