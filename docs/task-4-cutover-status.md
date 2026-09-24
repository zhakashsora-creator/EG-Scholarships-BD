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
- A non-sensitive PNG was uploaded to the private staging document vault and opened successfully by its authenticated owner.
- The exact document URL returned HTTP 401 without authentication, confirming the download gate is private.
- The temporary document file and its database record were removed after the test; the student vault returned to zero stored documents.

## Legacy student-data scope

The student and application records already present on staging are retained as test fixtures. They do not need to be deleted, enriched or reconciled further.

No additional Sites student accounts, profiles, applications, documents, reports, consultant requests or activity history will be migrated. The private, ignored delta captured on 24 September remains unused.

The migration target is the application itself: its polished interface, workflows, matching behaviour and scholarship catalogue. Do not replay the full Sites export over staging.

## Remaining cutover gates

1. Create the production scholarship catalogue schema in MariaDB and import the validated catalogue with stable IDs, official sources, funding type, countries, eligibility and deadlines.
2. Connect matching, fully funded priorities and catalogue filters to the MariaDB scholarship catalogue; retain safe fallback and deduplication behaviour during rollout.
3. Add Google OAuth for student sign-in and account linking, with staging and production redirect URIs and the existing sign-in method retained as a fallback.
4. Complete spotless release QA: responsive layout, accessibility, authentication, profile editing, uncapped matching, filters, tracked-application persistence, private documents, report download and failure-safe email messaging.
5. Back up MariaDB and private storage, deploy the release candidate and run final staging smoke tests without spending further effort on legacy student-data migration.
6. Change the production `scholarships` DNS record to the Namecheap application.
7. Retain the Sites deployment and rollback DNS target for at least 72 hours while monitoring health and sign-in flows.
