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
  assert.equal(rows.length, 116);
  assert.ok(rows.every((row) => row.name && row.country && /^https?:\/\//.test(row.officialSource)));
  assert.ok(rows.some((row) => /Erasmus Mundus/i.test(row.name)));
});

test("student access only presents the enabled email sign-in method", async () => {
  const [authClient, loginPage, landingPage] = await Promise.all([
    readFile(new URL("../app/login/AuthClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(authClient, /Email me a sign-in link/);
  assert.doesNotMatch(`${authClient}${loginPage}${landingPage}`, /signInWithOAuth|Continue with Google|Google \/ email sign in/);
});
