# Task 5: Scholarship catalogue maintenance

Started 2 October 2026 after the Namecheap production cutover. The live catalogue contains 475 records. Most were last verified on 16, 22 or 23 July 2026, so a repeatable freshness workflow is now more valuable than another one-off bulk import.

## Operating decision

Do not let an unattended scraper rewrite production scholarship data. Scholarship pages frequently move, reuse annual URLs, publish ambiguous deadlines, or change an edition from funded to self-funded. Automatic publication would turn temporary page failures and guessed dates into student-facing facts.

Use two layers instead:

1. A no-AI catalogue audit prioritizes stale records, approaching deadlines, passed deadlines whose status still appears open, lower-confidence entries and shared source URLs. This can run as often as desired without consuming Codex model usage.
2. A bounded official-source review checks a small batch and proposes evidence-backed changes. A human reviews the proposal before the JSON catalogue is changed, imported into MariaDB and deployed.

## Commands

- `pnpm catalogue:audit` validates all records and prints the next 12 records requiring review.
- `pnpm catalogue:check-links` also checks those 12 official URLs. It follows redirects, retries sites that reject `HEAD` with a bounded `GET`, distinguishes anti-bot blocking from missing pages, limits concurrency to three and never edits the catalogue or database.
- Add `--country=Finland`, `--limit=20` or `--output=path/to/report.json` when a focused or saved report is needed.
- `pnpm db:import-catalogue` remains the explicit, reviewed deployment step.

## Cadence and usage

- Daily: run the deterministic audit/link monitor. It uses ordinary hosting/network resources and no Codex model credits.
- Weekly: use Codex to review only the highest-priority batch against official sources and discover a small number of new European programme-specific opportunities.
- Monthly: review country coverage, duplicate providers and the expansion queue; then run the architecture and textile acceptance profiles before deployment.

A full daily AI crawl of hundreds of scholarships would use substantially more model and web-search allowance while producing many low-value repeat checks. The bounded weekly review keeps usage predictable and concentrates effort on deadlines, stale records and known catalogue gaps.

## Publication gate

Every proposed change must preserve the official URL and evidence date. Deadline, status, funding and eligibility changes require an official source. Closed or discontinued opportunities stay archived for history but are not returned as currently available matches. After review, run the full build and tests, import via the non-destructive catalogue upsert, and verify both the Textile and Architecture benchmark profiles before production deployment.
