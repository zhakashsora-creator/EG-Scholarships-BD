import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("EG Scholarships public landing source is complete", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /EG Scholarships/);
  assert.match(page, /Your scholarship search/);
  assert.match(page, /Private by design/);
  assert.match(layout, /Student Scholarship Workspace/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|Your site is taking shape/);
});

test("catalogue contains normalized, source-backed opportunities", async () => {
  const rows = JSON.parse(await readFile(new URL("../app/data/scholarships.json", import.meta.url), "utf8"));
  assert.equal(rows.length, 469);
  assert.ok(rows.every((row) => row.name && row.country && /^https?:\/\//.test(row.officialSource)));
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.ok(rows.some((row) => /Erasmus Mundus/i.test(row.name)));
  for (const source of ["UK Scholarship", "Europe Scholarship", "USA Scholarship", "Middle East Scholarship"]) {
    assert.ok(rows.some((row) => row.sourceDataset.includes(source)), `missing imported source: ${source}`);
  }
});

test("student access supports email-and-password sign in, registration and recovery", async () => {
  const [authClient, loginPage, landingPage, resetClient] = await Promise.all([
    readFile(new URL("../app/login/AuthClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reset-password/ResetPasswordClient.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(authClient, /signInWithPassword/);
  assert.match(authClient, /auth\.signUp/);
  assert.match(authClient, /resetPasswordForEmail/);
  assert.match(authClient, /Sign In/);
  assert.match(authClient, /Sign Up/);
  assert.match(resetClient, /updateUser\(\{ password \}\)/);
  assert.doesNotMatch(`${authClient}${loginPage}${landingPage}`, /signInWithOAuth|Continue with Google|Google \/ email sign in/);
});

test("first-login account setup requires only core contact fields and remains editable", async () => {
  const [dashboard, accountRoute, accountMigration] = await Promise.all([
    readFile(new URL("../app/dashboard/DashboardClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_old_peter_parker.sql", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /Create my student account/);
  assert.match(dashboard, /Save account changes/);
  assert.match(dashboard, /Profile photo/);
  assert.match(dashboard, /Present address/);
  assert.match(accountRoute, /normalizeBangladeshMobile/);
  assert.match(accountRoute, /MAX_PHOTO_BYTES/);
  assert.match(accountMigration, /CREATE TABLE `student_accounts`/);
});

test("portal includes theme controls, personalized analysis pages and a complete travel workflow", async () => {
  const [dashboard, analysisPage, analysisHelpers, themeToggle, applicationRoute, migration, css] = await Promise.all([
    readFile(new URL("../app/dashboard/DashboardClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/scholarship/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/scholarship-analysis.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ThemeToggle.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/applications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_application_journey.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(themeToggle, /eg-theme/);
  assert.match(css, /data-theme="dark"/);
  assert.match(dashboard, /View full match analysis/);
  assert.match(dashboard, /Fees paid \/ to pay/);
  assert.match(dashboard, /Plane tickets/);
  assert.match(dashboard, /Health insurance/);
  assert.match(dashboard, /Accommodation/);
  assert.match(analysisPage, /PROFILE VS REQUIREMENTS/);
  assert.match(analysisPage, /DETAILED COST PLAN/);
  assert.match(analysisHelpers, /buildNextSteps/);
  assert.match(applicationRoute, /workflow_json/);
  assert.match(migration, /workflow_json/);
});

test("study profile, optional documents, qualified Best Finds and resilient official discovery are wired together", async () => {
  const [dashboard, matching, analyze, workspaceRoute, gemini, geminiClient, guidelineRoute, officialGuidelines, courseRoute, courseFallback, envExample] = await Promise.all([
    readFile(new URL("../app/dashboard/DashboardClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/matching.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/workspace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/gemini-matching.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/gemini-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/guideline-check/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/official-guidelines.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/courses/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/course-discovery.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /\["profile", "03", "Study profile"\]/);
  assert.match(dashboard, /SSC \/ O-level qualification/);
  assert.match(dashboard, /HSC \/ A-level qualification/);
  assert.match(dashboard, /Have you completed a Bachelor/);
  assert.match(dashboard, /Bachelor&apos;s CGPA/);
  assert.match(dashboard, /Optional for matching/);
  assert.match(dashboard, /STUDENT RECORDS HUB/);
  assert.match(dashboard, /Emails & letters/);
  assert.match(dashboard, /Receipts/);
  assert.match(dashboard, /Open Student Records/);
  assert.match(dashboard, /APPLICATION & PRE-DEPARTURE TRACKER/);
  assert.match(dashboard, /best-finds-rail/);
  assert.match(dashboard, /Generate my Best Finds/);
  assert.doesNotMatch(dashboard, /Generate my Top Five/);
  assert.match(matching, /typeof limit === "number"/);
  assert.match(matching, /prioritizeDestinationDiversity/);
  assert.match(analyze, /enhanceMatchesWithGemini/);
  assert.match(analyze, /match\.score >= 50/);
  assert.match(analyze, /prioritizeDestinationDiversity/);
  assert.match(workspaceRoute, /row\.score < 50/);
  assert.match(workspaceRoute, /prioritizeDestinationDiversity/);
  assert.match(gemini, /geminiGenerateContent/);
  assert.match(geminiClient, /x-goog-api-key/);
  assert.match(geminiClient, /response\.status === 429/);
  assert.match(geminiClient, /gemini-3\.5-flash/);
  assert.match(dashboard, /Official checklists—even with zero uploads/);
  assert.match(dashboard, /PROFILE VS REQUIREMENTS/);
  assert.match(dashboard, /DETAILED COST PLAN/);
  assert.match(dashboard, /Find subjects & courses/);
  assert.match(guidelineRoute, /url_context/);
  assert.match(guidelineRoute, /baselineGuideline/);
  assert.match(officialGuidelines, /TB test certificate from a Home Office-approved clinic in Bangladesh/);
  assert.match(officialGuidelines, /No document upload is required|SSC\/O-level and HSC\/A-level/);
  assert.match(courseRoute, /google_search/);
  assert.match(courseRoute, /officialCourseFallback/);
  assert.match(courseFallback, /Official programme catalogue/);
  assert.match(envExample, /GEMINI_API_KEY=/);
  assert.match(envExample, /GEMINI_API_KEYS=/);
});
