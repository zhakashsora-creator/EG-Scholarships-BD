# Sites-to-owned-domain roadmap status

Updated 6 October 2026 after the normalized catalogue production deployment. The original twelve-task plan remains the governing sequence; this file maps it to the work now present in the Namecheap repository.

| Original task | Status | Evidence / remaining gate |
|---|---|---|
| 1. Regression repairs | Complete | Tracked applications survive re-matching, report email controls reflect configuration, and obsolete Best Finds copy is removed. |
| 2. Student-research benchmark | Complete | The sanitized Architecture benchmark and official-source dispositions are documented. |
| 3. Hosting ownership and feasibility | Complete | Namecheap Node.js, MariaDB, private storage, DNS, SSL and rollback were audited. |
| 4. Staging migration | Complete | Runtime, authentication, data, private files and release checks passed in staging. |
| 5. Live cutover | Complete | Production runs on Namecheap with HTTPS and Google sign-in; Sites remains the rollback target. |
| 6. Structured catalogue | Complete | The controlled production import created 475 active awards, 475 primary programmes and 475 current cycles while retaining all 475 legacy rollback rows. Build `60235db` is live and all 4 tracked applications remain. |
| 7. European coverage | In progress | Architecture benchmark records and two bounded official-source review batches are present. Textile/programme coverage still needs reviewed expansion. |
| 8. Eligibility and ranking | Substantially complete | Evidence-based subscores, hard gaps, differentiated scores and fully funded priorities are live; continue calibration as catalogue depth improves. |
| 9. Unrestricted results and filters | Substantially complete | All relevant results, funding/country/band/freshness filters and sorting are live. Shareable filter URLs and large-result pagination remain. |
| 10. Release acceptance tests | Substantially complete | Textile and Architecture benchmarks, persistence, email-state, mobile and production route checks pass. Add normalized-catalogue migration checks before the next release. |
| 11. Catalogue-maintenance pilot | In progress | Deterministic audits and a bounded weekly Codex review are active. A no-AI daily runner and one-week usage report remain. |
| 12. Public WordPress review | Not started | Optional and separate from portal migration; requires a measured performance, SEO, security and editorial audit. |

## Current execution order

1. Complete Task 9's shareable filters and pagination on staging.
2. Extend Task 10 tests to cover filtered URLs and production acceptance checks.
3. Run Task 7 in reviewed country/subject batches and finish the Task 11 maintenance pilot.
4. Retain the Task 6 legacy rollback table through at least one maintenance cycle, then test rollback before considering its removal.
5. Begin Task 12 only after the portal work is stable and only if the WordPress audit justifies a rebuild.
