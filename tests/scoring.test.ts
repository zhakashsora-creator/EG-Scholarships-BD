import assert from "node:assert/strict";
import test from "node:test";
import { buildFitChecks } from "../app/lib/scholarship-analysis";
import { buildCountryCoverageNotices, calibrateBestFindBands, prioritizeDestinationDiversity, rankScholarships, scholarships, type StudentProfile } from "../app/lib/matching";

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
  const top = calibrateBestFindBands(prioritizeDestinationDiversity(rankScholarships(textileProfile)).slice(0, 10));
  assert.equal(top.length, 10);
  assert.ok(new Set(top.map((match) => match.score)).size > 1);
  assert.deepEqual(top.map((match) => match.label), [
    "Strong match", "Strong match", "Strong match",
    "Possible match", "Possible match", "Possible match", "Possible match",
    "Reach", "Reach", "Reach",
  ]);
  assert.ok(top.every((match) => match.subScores.subjectFit <= 20 && match.subScores.englishHeadroom <= 14));
  assert.ok(buildCountryCoverageNotices(textileProfile, top).some((notice) => notice.message === "No Finland records matched your level and subject."));
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
