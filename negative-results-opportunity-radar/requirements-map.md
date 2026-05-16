# Requirements Map

Issue #16 asks for an AI research assistant suite with literature review, research gap finding, hypothesis generation, peer-review help, summarization, citation management, and reproducibility support.

| Requirement | Implementation |
| --- | --- |
| Research gap finder | `rankOpportunities` ranks gaps from negative results, limitations, and failed replications. |
| Literature review assistant | `extractSignals` turns paper metadata into normalized evidence records. |
| Hypothesis generation | Recommended actions convert negative evidence into bounded follow-up studies. |
| Peer review assistant | `buildAssistantPacket` emits prompts for checking missing negative-result context. |
| Citation support | Citation queries include topic, method, negative-result, limitation, and replication terms. |
| Reproducibility support | Opportunities flag failed replication and multi-paper evidence. |
| Scientific trust | Evidence records preserve paper IDs, titles, years, methods, topics, and digests. |

