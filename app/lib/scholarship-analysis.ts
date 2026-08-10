import type { Scholarship, StudentProfile } from "./matching";

export type FitCheck = {
  label: string;
  student: string;
  requirement: string;
  status: "Aligned" | "Check required" | "Missing detail";
};

export type CostItem = {
  item: string;
  awardPosition: string;
  planningAction: string;
};

function normalized(value?: string) {
  return (value ?? "").toLowerCase();
}

function includesAny(value: string, terms: string[]) {
  const text = normalized(value);
  return terms.some((term) => text.includes(normalized(term)));
}

function profileLevelTerms(level?: string) {
  if (includesAny(level ?? "", ["bachelor", "undergraduate"])) return ["bachelor", "undergraduate"];
  if (includesAny(level ?? "", ["master", "postgraduate"])) return ["master", "postgraduate"];
  if (includesAny(level ?? "", ["doctoral", "doctorate", "phd"])) return ["doctoral", "doctorate", "phd", "research"];
  return level ? [level] : [];
}

export function buildFitChecks(profile: StudentProfile, scholarship: Scholarship): FitCheck[] {
  const preferred = profile.preferredCountries?.join(", ") ?? "Not specified";
  const levelTerms = profileLevelTerms(profile.studyLevel);
  const levelAligned = levelTerms.length > 0 && includesAny(`${scholarship.studyLevel} ${scholarship.academicCriteria}`, levelTerms);
  const destinationAligned = Boolean(profile.preferredCountries?.some((country) => includesAny(`${scholarship.country} ${scholarship.destination}`, [country])));
  const fieldText = `${scholarship.subjectRestrictions} ${scholarship.category}`;
  const fieldAligned = Boolean(profile.field && (includesAny(fieldText, profile.field.split(/\s+/).filter((part) => part.length > 3)) || /all fields|all eligible|unrestricted/i.test(fieldText)));

  return [
    {
      label: "Nationality eligibility",
      student: "Bangladesh applicant",
      requirement: scholarship.bangladeshEligibility || "Not stated in the stored source",
      status: /bangladesh|international|worldwide|all nationalit/i.test(scholarship.bangladeshEligibility ?? "") ? "Aligned" : "Check required",
    },
    {
      label: "Study level",
      student: profile.studyLevel || "Not specified",
      requirement: scholarship.studyLevel || "Not stated",
      status: !profile.studyLevel ? "Missing detail" : levelAligned ? "Aligned" : "Check required",
    },
    {
      label: "Destination",
      student: preferred,
      requirement: scholarship.country || scholarship.destination,
      status: !profile.preferredCountries?.length ? "Missing detail" : destinationAligned ? "Aligned" : "Check required",
    },
    {
      label: "Academic result",
      student: profile.gpa || "Not specified",
      requirement: scholarship.academicCriteria || "Manual academic review required",
      status: profile.gpa ? "Check required" : "Missing detail",
    },
    {
      label: "English evidence",
      student: profile.englishScore || profile.englishTest || "Not specified",
      requirement: scholarship.englishRequirement || "Check the programme requirement",
      status: profile.englishScore ? "Check required" : "Missing detail",
    },
    {
      label: "Subject direction",
      student: profile.field || "Not specified",
      requirement: scholarship.subjectRestrictions || "No restriction recorded",
      status: !profile.field ? "Missing detail" : fieldAligned ? "Aligned" : "Check required",
    },
  ];
}

export function buildCostPlan(scholarship: Scholarship): CostItem[] {
  const funding = `${scholarship.coverage} ${scholarship.fundingSummary}`;
  const fullyFunded = /fully funded/i.test(funding);
  const tuitionMentioned = /tuition|fee waiver/i.test(funding);
  const livingMentioned = /living|stipend|allowance/i.test(funding);
  const travelMentioned = /travel|airfare|flight/i.test(funding);
  const insuranceMentioned = /insurance|health cover/i.test(funding);

  return [
    { item: "Tuition and university fees", awardPosition: fullyFunded || tuitionMentioned ? "Funding record indicates tuition support" : "Not confirmed as fully covered", planningAction: "Obtain the university fee schedule and written scholarship conditions." },
    { item: "Scholarship application fee", awardPosition: "No reliable amount in the stored record", planningAction: "Confirm whether the official application route charges a fee before payment." },
    { item: "Visa and biometrics", awardPosition: "Usually separate unless the award confirms otherwise", planningAction: "Use the destination government's current visa fee and approved payment route." },
    { item: "Living costs", awardPosition: livingMentioned ? "A living allowance or stipend is mentioned" : "No living-cost coverage is confirmed", planningAction: "Compare the award allowance with rent, food, transport and utilities for the destination city." },
    { item: "Health insurance", awardPosition: insuranceMentioned ? "Health cover is mentioned in the funding summary" : "Coverage and fee are not confirmed", planningAction: "Check the visa, institution and scholarship insurance requirements before purchase." },
    { item: "Flights and local travel", awardPosition: travelMentioned ? "Travel support is mentioned" : "Plan as student-funded until verified", planningAction: "Record route, baggage, flexibility and airport-transfer costs before booking." },
    { item: "Accommodation and deposit", awardPosition: "No accommodation amount is confirmed", planningAction: "Budget the deposit, first rent, utilities and any guarantor or booking fee." },
    { item: "Documents and pre-departure", awardPosition: "Normally separate", planningAction: "Allow for translations, attestations, medical checks, police clearance and courier charges where required." },
  ];
}

export function buildNextSteps(scholarship: Scholarship) {
  return [
    ["Recheck the live cycle", `Confirm ${scholarship.status || "current availability"} and the deadline on the official source.`],
    ["Validate eligibility", `Check the published nationality, academic, English and subject rules against every profile field and flagged gap.`],
    ["Choose the eligible programme", `Confirm whether admission is separate (${scholarship.separateAdmission || "not stated"}) and select a programme covered by the award.`],
    ["Prepare the evidence pack", scholarship.documents || "Prepare transcripts, certificates, passport, English evidence, CV, statement and references as required."],
    ["Submit through the correct route", scholarship.applicationRoute || "Use only the application route linked by the official source."],
    ["Review offer and award terms", "Check conditions, coverage, acceptance deadlines, deposits and any amount that remains payable."],
    ["Complete visa and health steps", "After receiving the required offer or award documents, follow the official visa, biometrics, medical and insurance process."],
    ["Arrange travel and accommodation", "Book only when timing is safe; record flight details, housing address, deposits, insurance and arrival instructions in the tracker."],
  ] as const;
}
