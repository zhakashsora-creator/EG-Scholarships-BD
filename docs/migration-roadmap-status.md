# Sites-to-owned-domain roadmap status

Updated 6 October 2026 after the Task 9 production deployment. The original twelve-task plan remains the governing sequence; this file maps it to the work now present in the Namecheap repository.

| Original task | Status | Evidence / remaining gate |
|---|---|---|
| 1. Regression repairs | Complete | Tracked applications survive re-matching, report email controls reflect configuration, and obsolete Best Finds copy is removed. |
| 2. Student-research benchmark | Complete | The sanitized Architecture benchmark and official-source dispositions are documented. |
| 3. Hosting ownership and feasibility | Complete | Namecheap Node.js, MariaDB, private storage, DNS, SSL and rollback were audited. |
| 4. Staging migration | Complete | Runtime, authentication, data, private files and release checks passed in staging. |
| 5. Live cutover | Complete | Production runs on Namecheap with HTTPS and Google sign-in; Sites remains the rollback target. |
| 6. Structured catalogue | Complete | The controlled production import created 475 active awards, 475 primary programmes and 475 current cycles while retaining all 475 legacy rollback rows. Build `aee593e` is live and all 4 tracked applications remain. |
| 7. European coverage | Complete | 42 comprehensive European and global opportunities added (517 total awards) across 51 destinations; deadlines audited to upcoming 2026/2027/2028 intakes; verified at 2026-10-06; structured overall summaries (cost, benefits, logistics) active on analysis pages. |
| 8. Eligibility and ranking | Substantially complete | Evidence-based subscores, hard gaps, differentiated scores and fully funded priorities are live; continue calibration as catalogue depth improves. |
| 9. Unrestricted results and filters | Complete | All relevant results remain uncapped; funding/country/band/freshness filters, sorting, shareable filter URLs and 12-result pagination are live in production build `aee593e`. |
| 10. Release acceptance tests | Substantially complete | Textile and Architecture benchmarks, persistence, email-state, mobile, normalized-catalogue parity, filter URL round-tripping and pagination wiring pass. Production identity and health passed with 5 students and all 4 applications retained; a final signed-in visual walkthrough remains. |
| 11. Catalogue-maintenance pilot | In progress | Deterministic audits and a bounded weekly Codex review are active. A no-AI daily runner and one-week usage report remain. |
| 12. Public WordPress review | Not started | Optional and separate from portal migration; requires a measured performance, SEO, security and editorial audit. |

## Current execution order

1. Complete the final signed-in visual walkthrough for Task 10.
2. Run Task 7 in reviewed country/subject batches and finish the Task 11 maintenance pilot.
3. Retain the Task 6 legacy rollback table through at least one maintenance cycle, then test rollback before considering its removal.
4. Begin Task 12 only after the portal work is stable and only if the WordPress audit justifies a rebuild.
