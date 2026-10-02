import assert from "node:assert/strict";
import test from "node:test";
import { buildVerificationQueue, validateCatalogue } from "../scripts/catalogue-maintenance.mjs";

const base = {
  id: "TEST-001",
  name: "Example Scholarship",
  provider: "Example University",
  country: "Finland",
  officialSource: "https://example.edu/scholarship",
  verifiedAt: "2026-07-01",
  deadline: "2026-10-20",
  status: "Open",
  confidence: "High",
};

test("catalogue validation rejects unsafe sources and duplicate identifiers", () => {
  const result = validateCatalogue([base, { ...base, officialSource: "http://example.edu/other" }]);
  assert.ok(result.errors.some((error) => /duplicate id/.test(error)));
  assert.ok(result.errors.some((error) => /must use HTTPS/.test(error)));
});

test("verification queue prioritizes near deadlines and stale records", () => {
  const records = [
    base,
    { ...base, id: "TEST-002", name: "Fresh Later Award", officialSource: "https://example.edu/later", verifiedAt: "2026-09-28", deadline: "2027-05-01" },
  ];
  const queue = buildVerificationQueue(records, { now: new Date("2026-10-02T00:00:00Z"), limit: 2 });
  assert.equal(queue[0].id, "TEST-001");
  assert.ok(queue[0].reasons.some((reason) => /deadline in 18 days/.test(reason)));
  assert.ok(queue[0].priority > queue[1].priority);
});

test("verification queue supports a bounded country batch", () => {
  const records = [base, { ...base, id: "TEST-003", country: "Germany", officialSource: "https://example.edu/germany" }];
  const queue = buildVerificationQueue(records, { now: new Date("2026-10-02T00:00:00Z"), limit: 1, country: "Germany" });
  assert.deepEqual(queue.map((item) => item.id), ["TEST-003"]);
});
