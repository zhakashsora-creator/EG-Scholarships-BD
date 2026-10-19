# Sites-to-owned-domain roadmap status

Updated 19 October 2026 after reconciling the Namecheap repository and Antigravity-era map/compass/theme work through `725aab1`. The original twelve-task plan remains the governing sequence; this file maps it to the work now present in the owned-domain repository.

| Original task | Status | Evidence / remaining gate |
|---|---|---|
| 1. Regression repairs | Complete | Tracked applications survive re-matching, report email controls reflect configuration, and obsolete Best Finds copy is removed. |
| 2. Student-research benchmark | Complete | The sanitized Architecture benchmark and official-source dispositions are documented. |
| 3. Hosting ownership and feasibility | Complete | Namecheap Node.js, MariaDB, private storage, DNS, SSL and rollback were audited. |
| 4. Staging migration | Complete | Runtime, authentication, data, private files and release checks passed in staging. |
| 5. Live cutover | Complete | Production runs on Namecheap with HTTPS and Google sign-in; Sites remains the rollback target. |
| 6. Structured catalogue | Complete | The controlled import/upsert model is established, with student-owned applications independent of catalogue ranking and the legacy rollback rows retained. The bundled catalogue now contains 569 deduplicated records. |
| 7. European and global coverage | Complete for the migration; ongoing maintenance | The catalogue now spans 79 destinations with 569 records, 183 fully funded/full-tuition records and 514 high-confidence records. Continue bounded official-source refreshes and subject-gap work. |
| 8. Eligibility and ranking | Substantially complete | Evidence-based subscores, hard gaps, differentiated scores and fully funded priorities are live; continue calibration as catalogue depth improves. |
| 9. Unrestricted results and filters | Complete | All relevant results remain uncapped; funding/country/band/freshness filters, sorting, shareable filter URLs and 12-result pagination are live in production build `aee593e`. |
| 10. Release acceptance tests | Substantially complete | Textile and Architecture benchmarks, persistence, email-state, mobile, normalized-catalogue parity, filter URL round-tripping and pagination wiring pass. Map/Compass mobile interaction, country briefs and sharing were added and refined. Production identity and health passed with 5 students and all 4 applications retained; repeat the signed-in visual walkthrough after material UI releases. |
| 11. Catalogue-maintenance pilot | In progress | Deterministic audits and a bounded weekly Codex review are active. A no-AI daily runner and one-week usage report remain. |
| 12. Public WordPress review | Not started | Optional and separate from portal migration; requires a measured performance, SEO, security and editorial audit. |

## Current execution order

1. Complete the final signed-in visual walkthrough for Task 10.
2. Continue Task 7 as reviewed country/subject maintenance batches and finish the Task 11 maintenance pilot.
3. Retain the Task 6 legacy rollback table through at least one maintenance cycle, then test rollback before considering its removal.
4. Begin Task 12 only after the portal work is stable and only if the WordPress audit justifies a rebuild.

## Antigravity-era application additions

The repository now includes the Global Study Compass and interactive scholarship-map surfaces at `/compass`, `/map` and `/maps`. October work added country briefs, scholarship-count exploration, full-screen details, mobile touch/pinch handling, shareable high-resolution social cards, continent coloring and legend improvements, polygon-first hit testing, catalogue/geographic-index deduplication, and a pre-hydration theme initializer that prevents dark-mode reload flash. The durable operational summary is maintained in `project-memory.md`.
