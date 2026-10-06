import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildVerificationQueue, validateCatalogue } from "../scripts/catalogue-maintenance.mjs";
import { fundingCategory, normalizeCatalogueRecord, validateCatalogueRecords } from "../scripts/catalogue-structure.mjs";

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

test("catalogue records normalize into award, programme and cycle entities", () => {
  const record = {
    ...base,
    destination: "Helsinki",
    category: "University scholarship",
    studyLevel: "Master",
    subjectRestrictions: "Textile and related fields",
    academicCriteria: "Relevant Bachelor's degree",
    englishRequirement: "IELTS 6.5",
    separateAdmission: "Yes",
    documents: "Transcript and motivation letter",
    fundingSummary: "Full tuition and living stipend",
    coverage: "Full",
    bangladeshEligibility: "Bangladesh applicants are eligible",
    intake: "Autumn 2027",
    deadlineTimezone: "Europe/Helsinki",
    applicationRoute: "University portal",
    priority: "A",
  };
  validateCatalogueRecords([record]);
  const structured = normalizeCatalogueRecord(record, 7);
  assert.equal(structured.award.id, "TEST-001");
  assert.equal(structured.award.fundingCategory, "Fully funded");
  assert.equal(structured.award.sourceOrder, 7);
  assert.equal(structured.programme.scholarshipId, "TEST-001");
  assert.equal(structured.programme.subjectRestrictions, "Textile and related fields");
  assert.equal(structured.cycle.scholarshipId, "TEST-001");
  assert.equal(structured.cycle.deadline, "2026-10-20");
});

test("funding normalization keeps self-funded programmes out of funded categories", () => {
  assert.equal(fundingCategory({ coverage: "Self-funded", fundingSummary: "No scholarship funding" }), "Self-funded");
});

test("every reviewed catalogue record has one deterministic primary programme and current cycle", async () => {
  const records = validateCatalogueRecords(JSON.parse(await readFile(new URL("../app/data/scholarships.json", import.meta.url), "utf8")));
  const structured = records.map(normalizeCatalogueRecord);
  assert.equal(structured.length, records.length);
  assert.ok(structured.length >= 475);
  assert.equal(new Set(structured.map((item) => item.award.id)).size, records.length);
  assert.equal(new Set(structured.map((item) => item.programme.id)).size, records.length);
  assert.equal(new Set(structured.map((item) => item.cycle.id)).size, records.length);
  for (const [index, item] of structured.entries()) {
    assert.equal(item.programme.scholarshipId, item.award.id);
    assert.equal(item.cycle.scholarshipId, item.award.id);
    assert.equal(item.award.officialSource, records[index].officialSource);
    assert.equal(item.cycle.deadline, records[index].deadline);
  }
});
