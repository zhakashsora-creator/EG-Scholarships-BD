# Task 4: Namecheap cutover status

Updated 24 September 2026. Production DNS still points to the Sites deployment.

## Completed staging gates

- Namecheap Node.js staging runtime is live with SSL.
- MariaDB is connected and reports four students and four tracked applications.
- The advanced textile-profile search returns 17 complete results plus a separate ten-option fully funded build-up list.
- Country and funding filters work, score values are differentiated, and the Finland catalogue gap is explicit.
- All four tracked applications survive a re-match, including Clarendon at Shortlist with an out-of-top-ten label.
- Report email is not offered while delivery is unavailable; the PDF remains downloadable.
- Unauthenticated document-list and document-download requests return HTTP 401.

## Current Sites snapshot comparison

The live Sites database contains four students, four student accounts, four applications, twenty stored legacy match rows, four reports, zero documents, six consultant requests and twenty-seven progress events.

The 21 September migration export contains the same counts except for five consultant requests and twenty-six progress events. The missing append-only rows were captured in a private, ignored delta file on 24 September.

Do not replay the full export over staging. Stored matches are derived data and the staging profile now has a newer uncapped result set. Use `npm run db:import-delta -- <dump>` for later reconciliation: append-only records insert by primary key, profiles/accounts/applications update only when the source `updated_at` is newer, and legacy matches plus pending upload sessions are intentionally skipped.

## Remaining cutover gates

1. Sign in to the existing staging test account and upload a non-sensitive test image.
2. Confirm the authenticated owner can download it and an unauthenticated request cannot.
3. Remove the test record and file after the check.
4. Begin a short production write freeze and take a final Sites database/R2 export.
5. Generate and review the final delta, then import it into MariaDB/private storage.
6. Reconcile all table and object counts and check for orphaned ownership rows.
7. Change the production `scholarships` DNS record to the Namecheap application.
8. Retain the Sites deployment and rollback DNS target for at least 72 hours while monitoring health and sign-in flows.
