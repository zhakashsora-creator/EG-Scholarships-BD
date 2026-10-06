# Task 9 shareable filters and pagination

Status: deployed to production and service-level acceptance complete.

## Delivered behavior

- Best Finds remains uncapped: ranking returns every relevant scholarship rather than truncating the catalogue to ten records.
- Results are presented 12 at a time for usability. Pagination changes only presentation and never removes, re-ranks or mutates a match.
- Search text, country, funding, match band, verification freshness, sort order and page are encoded in the dashboard URL.
- Default values are omitted so the unfiltered URL remains concise.
- Invalid or unsupported query values safely fall back to defaults.
- Changing or clearing a filter returns the visitor to page one.
- A shared or re-opened URL restores the same filter state and requested page; an out-of-range page is clamped to the final available page.

## Query parameters

| Parameter | Meaning |
|---|---|
| `q` | Free-text scholarship search |
| `country` | A country available in the current result set |
| `funding` | `Fully funded`, `Full tuition`, `Partial funding`, `Tuition discount` or `Other` |
| `band` | `Strong match`, `Possible match` or `Reach` |
| `freshness` | `Recently verified` or `Needs recheck` |
| `sort` | `score`, `deadline` or `country` |
| `page` | Positive page number; omitted for page one |

The existing `tab=matches` parameter is retained so shared URLs open Best Finds directly.

## Verification

- Targeted ESLint: no errors (one pre-existing unused-variable warning in the rendered HTML test).
- Scoring and filter unit tests: 6 passed.
- Rendered HTML and catalogue-maintenance tests: 16 passed.
- Namecheap production build: passed with Next.js 16.2.6 and TypeScript validation.

Production deployment was verified on 6 October 2026 as build `aee593eeb4dd1f88732cd978ff1c657e132ef63b` (Next build ID `eVTrX29RzsxUDfeebZfSi`). The live health check passed with authentication and MariaDB connected, retaining 5 student records and all 4 tracked applications. Focused automated coverage already verifies shared filter URL restoration, pagination boundaries, mobile controls and application persistence. A final signed-in visual walkthrough remains because the verification browser reached Google's authentication screen and authentication was not automated.
