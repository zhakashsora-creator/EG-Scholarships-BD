import assert from "node:assert/strict";
import test from "node:test";
import { buildFitChecks } from "../app/lib/scholarship-analysis";
import { buildAvailableMatches, buildCountryCoverageNotices, buildPriorityMatches, fundingCategory, rankScholarships, scholarships, type StudentProfile } from "../app/lib/matching";

const textileProfile: StudentProfile = {
  hasBachelorDegree: "yes",
  bachelorDegree: "BSc",
  bachelorSubject: "Clothing & Textile",
  bachelorCgpa: "3.56",
  bachelorCgpaScale: "4",
  studyLevel: "Master",
  field: "Textile",
  englishTest: "IELTS",
  englishScore: "6.0",
  preferredCountries: ["United Kingdom", "New Zealand", "Finland"],
  intake: "Annual",
};

test("textile profile produces differentiated scores and explicit Finland coverage", () => {
  const available = buildAvailableMatches(textileProfile, new Date("2026-09-23T10:00:00Z"));
  const priority = buildPriorityMatches(textileProfile, available, 10, new Date("2026-09-23T10:00:00Z"));
  assert.ok(available.length > 10);
  assert.equal(priority.length, 10);
  assert.ok(priority.every((match) => fundingCategory(match.scholarship) === "Fully funded"));
  assert.ok(new Set(available.map((match) => match.score)).size > 1);
  assert.ok(available.every((match) => match.subScores.subjectFit <= 20 && match.subScores.englishHeadroom <= 14));
  assert.ok(buildCountryCoverageNotices(textileProfile, available).some((notice) => notice.message === "No currently available Finland records matched your level and subject."));
});

test("architecture benchmark returns programme-specific leads, excludes 4CITIES and collapses UQGSS", () => {
  const profile: StudentProfile = {
    hasBachelorDegree: "yes", bachelorDegree: "B.Arch", bachelorSubject: "Architecture",
    bachelorCgpa: "2.98", bachelorCgpaScale: "4", studyLevel: "Master", field: "Architecture",
    englishTest: "Planning", preferredCountries: ["Australia", "Belgium", "Denmark", "Estonia", "Finland", "Germany", "Greece", "Hungary", "Iceland", "Lithuania", "Netherlands", "New Zealand", "Norway", "Romania", "Slovenia", "Spain", "Sweden", "Switzerland"],
    intake: "2027", fundingNeed: "Full tuition funding", workExperience: "3 years",
  };
  const available = buildAvailableMatches(profile, new Date("2026-09-23T10:00:00Z"));
  const ids = new Set(available.map((match) => match.scholarship.id));
  for (const id of ["ARCH-001", "ARCH-002", "ARCH-003", "ARCH-004", "ARCH-005"]) assert.ok(ids.has(id), `${id} should be available`);
  assert.ok(!ids.has("ARCH-006"));
  assert.equal(available.filter((match) => /UQGSS|Graduate School Scholarships/.test(match.scholarship.name)).length, 1);
  assert.ok(buildCountryCoverageNotices(profile, available).length > 0);
});

test("known high-English awards are not strong at IELTS 6.0 and UK aliases align", () => {
  const ranked = rankScholarships(textileProfile);
  for (const name of ["Clarendon Scholarships", "Gates Cambridge Scholarship"]) {
    const match = ranked.find((item) => item.scholarship.name === name);
    assert.ok(match);
    assert.equal(match.label, "Reach");
    assert.ok(match.hardGaps.some((gap) => /IELTS 7\.0/.test(gap)));
  }
  const gates = scholarships.find((item) => item.id === "BD-025");
  assert.ok(gates);
  const checks = buildFitChecks(textileProfile, gates);
  assert.equal(checks.find((check) => check.label === "Destination")?.status, "Aligned");
  assert.equal(checks.find((check) => check.label === "Study level")?.status, "Check required");
});
