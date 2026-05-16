# Requirements Map

Issue #12 asks for a rich collaborative editor with scientific formatting, real-time collaboration, version history, autosave, tasks, Jupyter integration, and high usability for researchers.

| Requirement | Implementation |
| --- | --- |
| Real-time collaboration | `applyOperation` accepts small typed operations that can be broadcast through a collaboration channel. |
| Scientific manuscript editing | Sections model manuscript text and notebook-backed analysis sections independently. |
| Version history | `buildVersionSnapshot` emits stable digest snapshots for review and audit history. |
| Autosave | Every direct edit, execution target, notebook output, freeze, and unfreeze stores an autosave digest. |
| Jupyter integration | `notebookOutput` and `expectedExecutionHash` gate stale notebook-backed content. |
| Task management | Blocking tasks prevent release until marked done. |
| Review collaboration | Blocking reviewer comments and suggestions gate freeze readiness. |
| Submission workflow | `freeze` and `unfreeze` model the pre-submission review lane. |

