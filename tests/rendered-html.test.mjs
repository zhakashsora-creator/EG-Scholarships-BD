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
