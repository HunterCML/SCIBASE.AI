# Requirements Map

| Issue requirement | Implementation |
| --- | --- |
| Peer reviews and comments influence reputation | Peer-review receipts carry points and immutable evidence digests. |
| Contributor credits are timestamped and credited | Contribution receipts can be amended without deleting the original record. |
| Transparent reputation metrics | `originalScore`, `correctedScore`, `scoreDelta`, and domain scores explain exactly what changed. |
| Reproducibility badge and peer validation support | Badge receipts can enter appeal hold while independent review completes. |
| Leaderboards and badge system | `leaderboardEligible` blocks profiles with unresolved retractions or appeal windows. |
| Profile history and project timelines | Original receipt digests are preserved in each adjusted receipt. |

## Reviewer Checklist

- Run `node reputation-correction-impact-ledger/test.js`.
- Run `node reputation-correction-impact-ledger/demo.js`.
- Confirm retracted review receipts score as zero but keep their original digest.
- Confirm amended contribution credits replace points instead of double-counting.
- Confirm appeal holds block leaderboard eligibility.
