# Task 4: Namecheap cutover status

Updated 1 October 2026. Production DNS now points to the Namecheap deployment. HTTPS, Google sign-in and the authenticated production workflow are verified live.

## Completed staging gates

- Namecheap Node.js staging runtime is live with SSL.
- MariaDB is connected and currently reports five student profiles and four tracked applications.
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
- Namecheap staging is running release `274d368` with `APP_PUBLIC_URL=https://scholarships-stage.egconsultancy.com.bd`; proxy-aware OAuth callbacks and sign-out preserve the public staging origin.
- End-to-end Google sign-in was verified with the existing test profile. It opened 17 matches and four retained applications; Clarendon remained at Shortlist with the out-of-top-ten label. Sign-out returned to the staging homepage rather than the internal bind address.
- The authenticated overview reports 475 source-backed catalogue opportunities, 49 destinations and 457 high-confidence records.
- The staging repository manifest was restored after a one-off archive extraction mistake. All 19 misplaced build artifacts were moved, without deletion, to the recoverable sibling folder `/home/egcoccrw/repositories/eg-scholarships-quarantine-20260930`.
- The release suite was rerun after cleanup: the production build, nine portal checks and four matching/scoring checks all passed.
- A fresh MariaDB backup and a scoped private-vault archive were downloaded locally and validated by decompression/listing. The vault archive contains only the current empty staging directories; no student documents are stored there.
- The CloudLinux conventional `server.js` entry point now bridges synchronously to the versioned staging launcher, so managed restarts no longer fail on an ESM top-level `await`.
- The stale staging worker was identified and recycled without touching production DNS or student data. The live server now reports deployment `274d368` and serves stylesheet `e01dcd14f9d1ff53.css`.
- Responsive QA passed live at 390×844: the profile form is one column, every sampled control stays inside the viewport, and horizontal overflow is absent. Desktop QA also reports no horizontal overflow.
- The final health check returned HTTP 200 with authentication and MariaDB connected; all five staging profiles and four tracked applications remain present.
- The production `scholarships.egconsultancy.com.bd` record was changed from the rollback CNAME `custom-domains.chatgpt.site` to Namecheap address `198.54.116.228`. Both authoritative Namecheap nameservers and the Cloudflare, Google and Quad9 public resolvers return the new address.
- The production hostname is attached to the existing Node.js application with `APP_PUBLIC_URL=https://scholarships.egconsultancy.com.bd`; the consultant link uses the production origin and the application was restarted on Git commit `42fdc2b`.
- Direct production-host checks return the expected release marker `274d368`, HTTP 200, configured authentication, a connected MariaDB database, five profiles and four tracked applications.
- Namecheap installed a domain-validated production certificate (expiry 17 April 2027). HTTPS returns HTTP 200 with valid hostname verification, and plain HTTP returns a permanent redirect to the same HTTPS URL.
- The production login page advertises unlimited Best Finds and renders the Google sign-in control. After the local DNS cache cleared, Google sign-in completed successfully on the production hostname and opened the existing test profile.
- The production profile retains the required BSc Clothing & Textile, 3.56/4.00 CGPA, IELTS 6.0, Master in Textile and Finland/New Zealand/United Kingdom preferences.
- Production Best Finds shows all 17 relevant results without a ten-result cap, plus a separate ten-option fully funded build-up list. Scores span 56-74 across the complete selected-destination set, and report delivery is limited to a secure PDF download while email is unavailable.
- The production country filter was exercised live: selecting Finland reduced the complete result set from 17 to seven Finland records. Funding, match-band, verification and sort controls are also present.
- The production Finland coverage notice explicitly states that no currently available Finland record matches both the level and Textile subject, while broader Finland awards remain visible for programme-level verification.
- The production Applications tracker retains all four records. Clarendon Scholarships remains at Shortlist and is labelled "No longer in your current top ten" rather than being deleted.

## Legacy student-data scope

The student and application records already present on staging are retained as test fixtures. They do not need to be deleted, enriched or reconciled further.

No additional Sites student accounts, profiles, applications, documents, reports, consultant requests or activity history will be migrated. The private, ignored delta captured on 24 September remains unused.

The migration target is the application itself: its polished interface, workflows, matching behaviour and scholarship catalogue. Do not replay the full Sites export over staging.

## Rollback and remaining cutover gates

The Sites deployment is retained. During the 72-hour monitoring period, rollback is the single DNS change `scholarships.egconsultancy.com.bd CNAME custom-domains.chatgpt.site` (previous TTL: 14,400 seconds).

1. Retain the Sites deployment and rollback DNS target for at least 72 hours while monitoring health and sign-in flows.
