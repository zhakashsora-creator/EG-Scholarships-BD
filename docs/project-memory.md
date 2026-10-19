# EG Scholarships current project memory

Updated 19 October 2026 after reconciling the repository and Antigravity-era commits through `725aab1`.

This is the durable handoff record for future work. It describes the current application, not the retired Sites prototype.

## Ownership and runtime

- Production: `https://scholarships.egconsultancy.com.bd`
- Hosting: Namecheap Node.js/Passenger with HTTPS
- Database: MariaDB for profiles, applications and catalogue data
- Authentication: Supabase Google OAuth with email/password fallback
- Private files: authenticated owner-only document routes; no legacy Sites document migration
- Source of truth: GitHub remote `zhakashsora-creator/EG-Scholarships-BD`
- Rollback: the old Sites deployment and its DNS target remain documented in `task-4-cutover-status.md`

The five pre-existing student fixtures and four tracked applications were retained. They do not need enrichment or reconciliation. New work should focus on the clean owned application and scholarship catalogue, not old user-generated Sites data.

## Product behavior that must not regress

- Best Finds returns every relevant match; it is not capped at ten.
- A separate top-ten list highlights fully funded opportunities that may become realistic after excellent profile build-up.
- Filters support country, funding, match band and evidence freshness, with shareable URLs and pagination.
- Scores are differentiated and expose component evidence; country/subject gaps such as Finland plus Textile are stated explicitly.
- Tracked applications persist independently of current match rank. A record outside the current top ten remains visible with a status label.
- Reports remain downloadable. Email and retry controls appear only when sending is genuinely configured.
- Documents are optional, private and tied to the authenticated owner.
- Each scholarship can open a detailed analysis with profile fit, hard gaps, award scope, costs, application route and next steps.

## Current catalogue snapshot

- 569 deduplicated records
- 79 destinations
- 183 records whose coverage identifies full funding or full tuition
- 514 high-confidence records
- bundled JSON: `app/data/scholarships.json`
- geographic index: `app/data/geo-scholarship-index.json`

Unattended scraping must not write directly to production. Run the deterministic audit first, review a bounded official-source batch, then import and deploy only approved changes. Treat 401, 403 and 429 source responses as blocked, not missing.

## Antigravity-era work now present

The October commit history adds and refines the Global Study Compass and scholarship maps:

- routes: `/compass`, `/map` and `/maps`
- continent/country exploration, scholarship counts and country briefs
- responsive desktop and mobile layouts, pinch/touch interaction and full-screen detail popups
- high-resolution share/OG export cards and social sharing
- continent coloring and legend spacing improvements
- polygon-first hit testing, removal of misleading island/microstate dots and removal of the canvas continent overlay
- catalogue and geographic-index deduplication, including duplicate MIS records
- pre-hydration theme initialization that removes dark-mode reload flash and theme-control label flicker

The core portal remains under `/dashboard`, with `/dashboard/scholarship/[id]` for analysis. Public access uses `/login`, `/auth/*` and `/reset-password`.

## Theme system

Theme preference is stored as `eg-theme`. Colors should use the CSS variables in `app/globals.css`; fixed light backgrounds require an explicit dark-theme override. The public process section, ghost CTA, hero support copy, trust statistics, product frame and privacy CTA are covered by the October 19 contrast repair. Keep the rendered HTML test assertions when changing these surfaces.

## Release gates

Before deployment:

1. Run `pnpm test` and `pnpm lint`.
2. Run `pnpm build:hosting` for the Linux artifact.
3. Confirm no credentials, private documents or database dumps are staged.
4. Commit and push to GitHub.
5. Promote the versioned archive through `server-stage.cjs` and restart the Namecheap application.
6. Verify `https://scholarships.egconsultancy.com.bd/__staging-build` and `/__staging-health`.
7. Check the homepage in both themes and run one signed-in profile/results/application persistence walkthrough.

## Remaining planned work

- continue the bounded catalogue-maintenance pilot and review subject/country gaps
- finish a signed-in visual acceptance walkthrough after material UI releases
- keep the legacy rollback table until rollback has been tested after a maintenance cycle
- treat the public WordPress review as a separate optional project
