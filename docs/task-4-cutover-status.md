# Task 4: Namecheap cutover status

Updated 29 September 2026. Production DNS still points to the Sites deployment.

## Completed staging gates

- Namecheap Node.js staging runtime is live with SSL.
- MariaDB is connected and reports four students and four tracked applications.
- The advanced textile-profile search returns 17 complete results plus a separate ten-option fully funded build-up list.
- Country and funding filters work, score values are differentiated, and the Finland catalogue gap is explicit.
- All four tracked applications survive a re-match, including Clarendon at Shortlist with an out-of-top-ten label.
- Report email is not offered while delivery is unavailable; the PDF remains downloadable.
- Unauthenticated document-list and document-download requests return HTTP 401.
- A non-sensitive PNG was uploaded to the private staging document vault and opened successfully by its authenticated owner.
- The exact document URL returned HTTP 401 without authentication, confirming the download gate is private.
- The temporary document file and its database record were removed after the test; the student vault returned to zero stored documents.
- The validated 475-record scholarship catalogue now has a MariaDB schema, a non-destructive upsert importer and an automatic first-run seed with a bundled outage fallback.
- Matching, fully funded priorities, country-gap notices, catalogue statistics, country/intake controls, course lookup and scholarship detail pages now read from the database-backed catalogue.
- Google OAuth is configured in Google Cloud and Supabase, the consent app is published, and the staging portal keeps email/password as a fallback.
- Supabase permits the exact staging callback and the query-safe staging callback pattern. The production callback remains registered and production DNS was not changed.
- Namecheap staging is running release `efb3760` with `APP_PUBLIC_URL=https://scholarships-stage.egconsultancy.com.bd`; proxy-aware OAuth callbacks and sign-out now preserve the public staging origin.
- End-to-end Google sign-in was verified with the existing test profile. It opened 17 matches and four retained applications; Clarendon remained at Shortlist with the out-of-top-ten label. Sign-out returned to the staging homepage rather than the internal bind address.
- The authenticated overview reports 475 source-backed catalogue opportunities, 49 destinations and 457 high-confidence records.

## Legacy student-data scope

The student and application records already present on staging are retained as test fixtures. They do not need to be deleted, enriched or reconciled further.

No additional Sites student accounts, profiles, applications, documents, reports, consultant requests or activity history will be migrated. The private, ignored delta captured on 24 September remains unused.

The migration target is the application itself: its polished interface, workflows, matching behaviour and scholarship catalogue. Do not replay the full Sites export over staging.

## Remaining cutover gates

1. Complete the remaining spotless release QA: responsive layout, accessibility, profile editing, uncapped matching, filters, report download and failure-safe email messaging.
2. Back up MariaDB and private storage, deploy the release candidate and run final staging smoke tests without spending further effort on legacy student-data migration.
3. Change the production `scholarships` DNS record to the Namecheap application only after explicit cutover approval.
4. Retain the Sites deployment and rollback DNS target for at least 72 hours while monitoring health and sign-in flows.
