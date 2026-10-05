# Task 6: Structured scholarship catalogue

Started 6 October 2026. The live portal already reads its 475 opportunities from MariaDB, but the first database version preserved each complete record in a `data_json` column. That was useful for a safe migration but does not model an award, an eligible programme and an application cycle independently.

## New structure

- `catalogue_awards` holds the stable award identity, provider, destination, funding classification, Bangladesh eligibility, official source and provenance.
- `catalogue_programmes` holds study level, subject scope, academic and English requirements, admission relationship and document requirements. The schema supports more than one programme per award.
- `catalogue_cycles` holds intake, deadline, timezone, status, application route, verification date, confidence and priority. The schema supports historical and future cycles without overwriting the award identity.

The existing `scholarship_catalogue` table remains intact as a rollback source during the transition. No student, account, application, report, document or activity tables are changed.

## Controlled import

`pnpm db:import-catalogue -- --dry-run` validates and normalizes the reviewed catalogue without connecting to MariaDB. The normal import writes the legacy rollback row and the three normalized rows in one transaction, then reports independent active-row counts for awards, programmes and cycles.

At application startup, the normalized tables are created if needed, but they are not populated inside a student request. The application switches to them only when their active award count exactly matches the legacy catalogue count. Until the controlled import succeeds, it keeps reading the legacy table; if database access fails, the bundled catalogue remains the outage fallback.

## Release gate

Before production import:

1. Validate all catalogue records and run the complete test/build suite.
2. Confirm normalized award, primary-programme and current-cycle counts equal the reviewed source count.
3. Confirm Textile and Architecture benchmark results are unchanged.
4. Import on Namecheap, restart, and verify the health endpoint, catalogue total, Best Finds, tracked applications and a tracked out-of-top-ten detail page.
5. Retain `scholarship_catalogue` until the normalized structure has completed at least one maintenance cycle and rollback has been tested.
