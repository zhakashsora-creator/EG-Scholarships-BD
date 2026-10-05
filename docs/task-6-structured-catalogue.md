# Task 6: Structured scholarship catalogue

Completed 6 October 2026. The live portal already read its 475 opportunities from MariaDB, but the first database version preserved each complete record in a `data_json` column. That was useful for a safe migration but did not model an award, an eligible programme and an application cycle independently.

## New structure

- `catalogue_awards` holds the stable award identity, provider, destination, funding classification, Bangladesh eligibility, official source and provenance.
- `catalogue_programmes` holds study level, subject scope, academic and English requirements, admission relationship and document requirements. The schema supports more than one programme per award.
- `catalogue_cycles` holds intake, deadline, timezone, status, application route, verification date, confidence and priority. The schema supports historical and future cycles without overwriting the award identity.

The existing `scholarship_catalogue` table remains intact as a rollback source during the transition. No student, account, application, report, document or activity tables are changed.

## Controlled import

`pnpm db:import-catalogue -- --dry-run` validates and normalizes the reviewed catalogue without connecting to MariaDB. The normal import writes the legacy rollback row and the three normalized rows in one transaction, then reports independent active-row counts for awards, programmes and cycles.

At application startup, the normalized tables are created if needed, but they are not populated inside a student request. The application switches to them only when their active award count exactly matches the legacy catalogue count. Until the controlled import succeeds, it keeps reading the legacy table; if database access fails, the bundled catalogue remains the outage fallback.

## Production result

The production import completed transactionally with return code 0:

- 475 active awards
- 475 active primary programmes
- 475 active current cycles
- 475 active legacy rollback rows

The verified Linux artifact was activated as deployment `60235db1936e16808ed102e7657a9c641cd943f4`. The health endpoint remained green with 5 students and 4 applications. A signed-in production check showed all 17 profile matches and all 4 tracked applications, including Clarendon Scholarships at Shortlist with the "No longer in your current top ten" label.

Keep `scholarship_catalogue` through at least one maintenance cycle and test rollback before considering its removal.
