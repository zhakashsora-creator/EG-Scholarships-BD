# Task 7: European & Global Intake Expansion & Catalogue Enrichment

## Overview
- **Completed:** 6 October 2026
- **Total Catalogue Count:** 517 curated opportunities across 51 destinations.
- **Coverage Added:** 42 dedicated European & flagship global opportunities spanning Germany, France, Italy, Netherlands, Sweden, Finland, Norway, Denmark, Ireland, Switzerland, Austria, Hungary, Poland, Belgium, Spain, Czechia, UK, USA, Japan, South Korea, Turkey, Singapore, and Saudi Arabia.
- **Verification Timestamp:** All 517 records updated with `verifiedAt: "2026-10-06"`.
- **Feature Addition:** Structured `overallSummary` micro-cards (Tuition & Direct Costs, Stipend & Allowances, Key Logistics & Criteria) surfaced on `/dashboard/scholarship/[id]` match analysis views.
- **Data Protection:** Zero loss of user accounts (5) or student application trackers (4) via non-destructive upserts (`ON DUPLICATE KEY UPDATE`).

## Added Opportunities Summary
| ID | Award Name | Destination | Funding Category | Deadline |
|---|---|---|---|---|
| EUR-DE-001 | DAAD Development-Related Postgraduate Courses (EPOS) | Germany | Fully funded | 2027-01-31 |
| EUR-DE-002 | DAAD Helmut-Schmidt-Programme (PPGG) | Germany | Fully funded | 2027-07-31 |
| EUR-DE-003 | Deutschlandstipendium National Scholarship Programme | Germany | Partial funding | 2027-07-15 |
| EUR-DE-004 | Heinrich Böll Foundation Study Grants | Germany | Fully funded | 2027-03-01 |
| EUR-FR-001 | France Eiffel Excellence Scholarship Programme | France | Fully funded | 2027-01-10 |
| EUR-FR-002 | Emile Boutmy Scholarship (Sciences Po) | France | Tuition discount | 2027-04-10 |
| EUR-FR-003 | Université Paris-Saclay International Master’s Scholarships | France | Fully funded | 2027-05-15 |
| EUR-IT-001 | Italian Government MAECI Grants for Foreign Citizens | Italy | Fully funded | 2027-06-14 |
| EUR-IT-002 | Politecnico di Milano Merit-Based International Scholarships | Italy | Full tuition | 2027-05-28 |
| EUR-IT-003 | University of Bologna (Unibo Action 1 & 2) Study Grants | Italy | Full tuition | 2027-04-30 |
| EUR-IT-004 | University of Padua International Excellence Scholarships | Italy | Full tuition | 2027-05-02 |
| EUR-NL-001 | NL Scholarship (Formerly Holland Scholarship) | Netherlands | Partial funding | 2027-05-01 |
| EUR-NL-002 | Utrecht Excellence Scholarships | Netherlands | Full tuition | 2027-02-01 |
| EUR-NL-003 | TU Delft Justus & Louise van Effen Excellence Scholarships | Netherlands | Fully funded | 2026-12-01 |
| EUR-SE-001 | Swedish Institute Scholarship for Global Professionals (SISGP) | Sweden | Fully funded | 2027-02-15 |
| EUR-SE-002 | KTH Royal Institute of Technology One-Year / Master Scholarships | Sweden | Full tuition | 2027-01-15 |
| EUR-SE-003 | Lund University Global Scholarship Programme | Sweden | Full tuition | 2027-02-15 |
| EUR-FI-001 | Finland Scholarship Programme for International Master’s | Finland | Full tuition | 2027-01-20 |
| EUR-FI-002 | Aalto University International Student Scholarship | Finland | Full tuition | 2027-01-22 |
| EUR-NO-001 | BI Norwegian Business School Presidential & Master Scholarships | Norway | Full tuition | 2027-03-01 |
| EUR-DK-001 | Danish Government Scholarships under the Cultural Agreements | Denmark | Fully funded | 2027-03-01 |
| EUR-IE-001 | Government of Ireland International Education Scholarships (GOI-IES) | Ireland | Fully funded | 2027-03-24 |
| EUR-IE-002 | UCD Global Excellence Undergraduate & Postgraduate Scholarships | Ireland | Full tuition | 2027-03-31 |
| EUR-CH-001 | Swiss Government Excellence Scholarships for Foreign Scholars | Switzerland | Fully funded | 2026-11-15 |
| EUR-CH-002 | ETH Zurich Excellence Scholarship & Opportunity Programme (ESOP) | Switzerland | Fully funded | 2026-12-15 |
| EUR-AT-001 | Austrian Database for Scholarships and Research (Grants.at - Ernst Mach) | Austria | Partial funding | 2027-03-01 |
| EUR-HU-001 | Stipendium Hungaricum Scholarship Programme (Bangladesh Quota) | Hungary | Fully funded | 2027-01-15 |
| EUR-PL-001 | Poland NAWA Stefan Banach Scholarship Programme | Poland | Fully funded | 2027-06-25 |
| EUR-BE-001 | Master Mind Scholarships Flanders Government (Belgium) | Belgium | Full tuition | 2027-04-28 |
| EUR-BE-002 | VLIR-UOS ICP Connect International Scholarships | Belgium | Fully funded | 2027-02-01 |
| EUR-ES-001 | Spanish MAEC-AECID International Scholarships | Spain | Fully funded | 2027-03-15 |
| EUR-CZ-001 | Czech Government Scholarships for Developing Countries | Czech Republic | Fully funded | 2027-09-30 |
| GLB-UK-001 | Chevening Scholarships (Foreign, Commonwealth & Development Office) | United Kingdom | Fully funded | 2026-11-05 |
| GLB-UK-002 | Commonwealth Master's Scholarships (CSC UK) | United Kingdom | Fully funded | 2026-12-12 |
| GLB-UK-003 | GREAT Scholarships British Council (Bangladesh Selection) | United Kingdom | Tuition discount | 2027-05-31 |
| GLB-US-001 | Fulbright Foreign Student Program (United States) | United States | Fully funded | 2027-05-15 |
| GLB-US-002 | Hubert H. Humphrey Fellowship Program | United States | Fully funded | 2027-06-01 |
| GLB-JP-001 | MEXT Japanese Government Scholarship (Embassy Recommendation) | Japan | Fully funded | 2027-05-20 |
| GLB-KR-001 | Global Korea Scholarship (GKS Graduate Degree Track) | South Korea | Fully funded | 2027-03-15 |
| GLB-TR-001 | Türkiye Bursları Government Scholarship Programme | Turkey | Fully funded | 2027-02-20 |
| GLB-SG-001 | Singapore International Graduate Award (SINGA) | Singapore | Fully funded | 2026-12-01 |
| GLB-SA-001 | King Fahd University of Petroleum & Minerals (KFUPM) Graduate Scholarship | Saudi Arabia | Fully funded | 2026-12-17 |

## Verification
- Local build & tests: All 22 tests passing with zero errors.
- Schema compatibility: Added `overall_summary TEXT` in `catalogue_awards` and non-destructive automated sync in `server.cjs`.
- Staging archive: Packaged as `next-build-e261006.zip`.
