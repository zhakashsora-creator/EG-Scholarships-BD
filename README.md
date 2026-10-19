# EG Scholarships Portal

Production scholarship discovery and application workspace for Excellence Global. The owned deployment runs at [scholarships.egconsultancy.com.bd](https://scholarships.egconsultancy.com.bd) on Namecheap; the former Sites deployment is retained only as a rollback target.

## Current product

- Supabase authentication with Google OAuth plus email/password fallback
- persistent student profiles, private documents and tracked applications in MariaDB
- uncapped profile-aware Best Finds with country, funding, match-band and freshness filters
- a separate ten-option fully funded build-up list
- evidence-based score breakdowns, gap notices, detailed scholarship analysis, costs and next steps
- PDF reports, with email controls shown only when delivery is configured
- Global Study Compass and interactive scholarship maps with country briefs, mobile gestures and share/export cards
- light and dark themes across the public site and signed-in portal

The bundled catalogue currently contains 569 deduplicated opportunities across 79 destinations, including 183 fully funded records. Scholarship facts must remain source-backed and go through the maintenance review described in `docs/task-5-catalogue-maintenance.md`.

## Local development

Requires Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
```

Copy `.env.example` to `.env.local` and supply local Supabase and MariaDB values. Never commit live credentials or student documents.

## Important commands

- `pnpm build:hosting` — webpack production build for Namecheap Linux hosting
- `pnpm db:import-catalogue` — reviewed, non-destructive catalogue upsert
- `pnpm db:verify` — migration and database checks
- `pnpm catalogue:audit` — deterministic 12-record freshness/quality queue
- `pnpm catalogue:check-links` — bounded official-link checks

## Project records

- `docs/project-memory.md` — current architecture, features, operational state and known gates
- `docs/migration-roadmap-status.md` — original migration plan mapped to completed work
- `docs/task-4-cutover-status.md` — Namecheap cutover and rollback evidence
- `docs/task-5-catalogue-maintenance.md` — safe catalogue review workflow
- `docs/task-6-structured-catalogue.md` and `docs/task-7-european-coverage.md` — data model and coverage work
- `docs/task-9-shareable-filters.md` — results/filter behavior

## Deployment model

The GitHub remote is the durable source repository. Namecheap runs `server.js`/`server-stage.cjs`, which promotes the newest checked-in `next-build-<commit>.zip` artifact and starts `server.cjs`. Build and tests must pass before an archive, launcher change, push or cPanel restart. Verify `/__staging-build` and `/__staging-health` after every production restart.

Student-owned applications are independent of current matching rank and must never be deleted by catalogue refreshes or re-matching.
