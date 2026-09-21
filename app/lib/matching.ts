import scholarshipData from "../data/scholarships.json";

export type Scholarship = (typeof scholarshipData)[number];

export type StudentProfile = {
  studyLevel?: string;
  preferredCountries?: string[];
  field?: string;
  gpa?: string;
  secondaryQualification?: string;
  secondaryBoard?: string;
  secondaryYear?: string;
  secondaryResult?: string;
  higherSecondaryQualification?: string;
  higherSecondaryBoard?: string;
  higherSecondaryYear?: string;
  higherSecondaryResult?: string;
  hasBachelorDegree?: "yes" | "no" | "";
  bachelorDegree?: string;
  bachelorInstitution?: string;
  bachelorSubject?: string;
  bachelorCgpa?: string;
  bachelorCgpaScale?: string;
  bachelorGraduationYear?: string;
  wantsBachelorAbroad?: "yes" | "no" | "";
  englishTest?: string;
  englishScore?: string;
  budget?: string;
  budgetCurrency?: string;
  fundingNeed?: string;
  studyMode?: string;
  intake?: string;
  workExperience?: string;
  researchExperience?: string;
  extracurriculars?: string;
  careerGoals?: string;
  notes?: string;
};

export type MatchSubScores = {
  eligibility: number;
  studyLevel: number;
  subjectFit: number;
  englishHeadroom: number;
  academics: number;
  destination: number;
  timing: number;
  funding: number;
  evidence: number;
};

export type ScholarshipMatch = {
  scholarship: Scholarship;
  score: number;
  label: "Strong match" | "Possible match" | "Reach";
  rationale: string;
  gaps: string[];
  hardGaps: string[];
  subScores: MatchSubScores;
};

export type CountryCoverageNotice = { country: string; message: string; alternatives: string[] };

/** Preserve score order while spreading equal-scoring opportunities across destinations. */
export function prioritizeDestinationDiversity(matches: ScholarshipMatch[]) {
  const ordered: ScholarshipMatch[] = [];
  for (let index = 0; index < matches.length;) {
    const score = matches[index].score;
    const scoreGroup: ScholarshipMatch[] = [];
    while (index < matches.length && matches[index].score === score) {
      scoreGroup.push(matches[index]);
      index += 1;
    }
    const countries = new Map<string, ScholarshipMatch[]>();
    for (const match of scoreGroup) {
      const country = match.scholarship.country || match.scholarship.destination || "Other";
      countries.set(country, [...(countries.get(country) ?? []), match]);
    }
    const queues = [...countries.values()];
    while (queues.some((queue) => queue.length)) {
      for (const queue of queues) {
        const next = queue.shift();
        if (next) ordered.push(next);
      }
    }
  }
  return ordered;
}

export function profileCompleteness(profile: StudentProfile) {
  const core: unknown[] = [
    profile.secondaryQualification, profile.secondaryResult, profile.higherSecondaryQualification,
    profile.higherSecondaryResult, profile.studyLevel, profile.field, profile.preferredCountries?.length,
    profile.intake, profile.budget, profile.budgetCurrency, profile.fundingNeed, profile.englishTest,
    profile.englishTest && !/not taken|planning/i.test(profile.englishTest) ? profile.englishScore : "not required yet",
  ];
  if (profile.hasBachelorDegree === "yes") core.push(profile.bachelorDegree, profile.bachelorCgpa);
  if (profile.hasBachelorDegree === "no") core.push(profile.wantsBachelorAbroad);
  return Math.round((core.filter(Boolean).length / core.length) * 100);
}

function normalize(value?: string) {
  return (value ?? "").toLocaleLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9.]+/g, " ").trim();
}

function tokens(value?: string) {
  const ignored = new Set(["and", "the", "for", "with", "study", "studies", "master", "masters", "programme", "programmes", "program", "degree"]);
  return normalize(value).split(/\s+/).filter((item) => item.length > 2 && !ignored.has(item));
}

function containsAny(haystack: string, needles: string[]) {
  const normalized = normalize(haystack);
  return needles.some((needle) => normalized.includes(normalize(needle)));
}

function numericValue(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

const COUNTRY_ALIASES: string[][] = [
  ["uk", "united kingdom", "england", "scotland", "wales", "northern ireland"],
  ["usa", "us", "united states", "united states of america", "america"],
  ["uae", "united arab emirates", "emirates"],
  ["south korea", "republic of korea", "korea"],
];

function countryTerms(country: string) {
  const value = normalize(country);
  return COUNTRY_ALIASES.find((group) => group.some((alias) => normalize(alias) === value)) ?? [country];
}

export function countryMatches(countryText: string, preference: string) {
  return containsAny(countryText, countryTerms(preference));
}

export type LevelCompatibility = "aligned" | "partial" | "gap" | "unknown";

export function studyLevelCompatibility(target?: string, scholarshipLevel?: string): LevelCompatibility {
  const requested = normalize(target);
  const offered = normalize(scholarshipLevel);
  if (!requested || !offered) return "unknown";
  if (/master|postgraduate/.test(requested)) {
    if (/master|msc|ma |meng|mph|mba/.test(offered)) return "aligned";
    if (/postgraduate/.test(offered)) return /phd|doctoral|mlitt/.test(offered) ? "partial" : "aligned";
    return "gap";
  }
  if (/bachelor|undergraduate/.test(requested)) return /bachelor|undergraduate/.test(offered) ? "aligned" : "gap";
  if (/doctoral|doctorate|phd/.test(requested)) return /doctoral|doctorate|phd|research degree/.test(offered) ? "aligned" : "gap";
  return containsAny(offered, tokens(requested)) ? "aligned" : "gap";
}

const SUBJECT_GROUPS = [
  ["textile", "textiles", "clothing", "apparel", "fashion", "garment", "fabric"],
  ["computer", "computing", "software", "informatics", "data", "artificial intelligence", "cyber"],
  ["engineering", "technology", "technical"],
  ["business", "management", "commerce", "finance", "economics", "marketing"],
  ["health", "medicine", "medical", "public health", "nursing", "pharmacy"],
  ["agriculture", "agricultural", "food", "forestry"],
  ["environment", "environmental", "climate", "sustainability"],
  ["law", "legal"], ["education", "teaching"],
];

export type SubjectCompatibility = "direct" | "broad" | "weak" | "gap" | "unknown";

export function subjectCompatibility(field?: string, scholarshipText?: string): SubjectCompatibility {
  if (!field) return "unknown";
  const desired = tokens(field);
  const offered = normalize(scholarshipText);
  if (!offered) return "unknown";
  const expanded = new Set(desired);
  for (const group of SUBJECT_GROUPS) {
    if (group.some((term) => desired.some((token) => normalize(term).includes(token) || token.includes(normalize(term))))) {
      group.forEach((term) => expanded.add(normalize(term)));
    }
  }
  if ([...expanded].some((term) => term.length > 2 && offered.includes(term))) return "direct";
  if (/all subjects|all fields|all eligible|any field|unrestricted|eligible .*program/.test(offered)) return "broad";
  if (/international master|english taught|degree programme/.test(offered)) return "weak";
  return "gap";
}

function explicitRequirement(text: string, label: "gpa" | "ielts") {
  const pattern = label === "gpa" ? /(?:gpa|cgpa)[^0-9]{0,18}(\d(?:\.\d+)?)/i : /ielts[^0-9]{0,18}(\d(?:\.\d+)?)/i;
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function deadlineState(scholarship: Scholarship, now: Date) {
  const status = normalize(`${scholarship.status} ${scholarship.deadlineTimezone}`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(scholarship.deadline ?? "") ? new Date(`${scholarship.deadline}T23:59:59Z`) : null;
  return { date, closed: /closed|expired|past deadline/.test(status) || Boolean(date && date.getTime() < now.getTime()) };
}

export function verificationAgeDays(scholarship: Scholarship, now = new Date()) {
  const raw = String(scholarship.verifiedAt ?? "");
  const checked = new Date(raw.includes(" ") ? `${raw.replace(" ", "T")}Z` : `${raw}T00:00:00Z`);
  return Number.isFinite(checked.getTime()) ? Math.floor((now.getTime() - checked.getTime()) / 86_400_000) : Number.POSITIVE_INFINITY;
}

function scoreOne(profile: StudentProfile, scholarship: Scholarship, now: Date): ScholarshipMatch {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const hardGaps: string[] = [];
  const levelFit = studyLevelCompatibility(profile.studyLevel, scholarship.studyLevel);
  const subjectFit = subjectCompatibility(profile.field, `${scholarship.subjectRestrictions} ${scholarship.category}`);
  const preferred = profile.preferredCountries ?? [];
  const bangladeshEligible = /bangladesh|international|worldwide|all nationalit/.test(normalize(scholarship.bangladeshEligibility ?? ""));
  const academicResult = profile.hasBachelorDegree === "yes" ? profile.bachelorCgpa || profile.gpa : profile.higherSecondaryResult || profile.gpa;
  const bachelorResult = numericValue(profile.bachelorCgpa || profile.gpa);
  const bachelorScale = numericValue(profile.bachelorCgpaScale) ?? 4;
  const profileGpa = profile.hasBachelorDegree === "yes" && bachelorResult !== null && bachelorScale > 0 ? (bachelorResult / bachelorScale) * 4 : numericValue(profile.gpa);
  const gpaRequirement = explicitRequirement(scholarship.academicCriteria ?? "", "gpa");
  const profileEnglish = numericValue(profile.englishScore);
  const namedHighEnglishAward = /clarendon|gates cambridge/i.test(`${scholarship.name} ${scholarship.provider}`);
  const englishRequirement = explicitRequirement(scholarship.englishRequirement ?? "", "ielts") ?? (namedHighEnglishAward ? 7 : null);
  const deadline = deadlineState(scholarship, now);
  const statusText = normalize(scholarship.status);
  const fundingText = `${scholarship.coverage} ${scholarship.fundingSummary}`;
  const fundingScore = /fully funded/i.test(fundingText)
    ? 4
    : /100% tuition|full tuition/i.test(fundingText)
      ? 3
      : /stipend|partial|waiver|toward tuition|up to/i.test(fundingText)
        ? 2
        : /discount|reduction/i.test(fundingText)
          ? 1
          : 0;
  const intakeYear = profile.intake?.match(/20\d{2}/)?.[0];
  const stale = verificationAgeDays(scholarship, now) > 60;
  const confidence = normalize(scholarship.confidence);
  const lowConfidence = !/high/.test(confidence);

  const subScores: MatchSubScores = {
    eligibility: bangladeshEligible ? 16 : 0,
    studyLevel: levelFit === "aligned" ? 18 : levelFit === "partial" || levelFit === "unknown" ? 8 : 0,
    subjectFit: subjectFit === "direct" ? 20 : subjectFit === "broad" ? 11 : subjectFit === "weak" || subjectFit === "unknown" ? 5 : 0,
    englishHeadroom: englishRequirement === null || profileEnglish === null ? 7 : profileEnglish >= englishRequirement + 1 ? 14 : profileEnglish >= englishRequirement + .5 ? 12 : profileEnglish >= englishRequirement ? 10 : 0,
    academics: gpaRequirement === null || profileGpa === null ? 7 : profileGpa >= gpaRequirement + .35 ? 12 : profileGpa >= gpaRequirement ? 10 : 0,
    destination: !preferred.length || preferred.some((country) => countryMatches(`${scholarship.country} ${scholarship.destination}`, country)) ? 8 : 0,
    timing: deadline.closed ? 0 : intakeYear && containsAny(`${scholarship.intake} ${scholarship.status}`, [intakeYear]) ? 5 : /open|active|rolling/.test(statusText) ? 4 : 2,
    funding: fundingScore,
    evidence: stale ? 0 : confidence === "high" ? 3 : /medium/.test(confidence) ? 2 : 1,
  };

  if (bangladeshEligible) reasons.push("Bangladesh eligibility is documented");
  else hardGaps.push("Bangladesh eligibility is not confirmed");
  if (levelFit === "aligned") reasons.push("target study level aligns");
  else if (levelFit === "partial") gaps.push("study level is only partly aligned; confirm the exact eligible course");
  else if (levelFit === "gap") hardGaps.push("study-level eligibility does not align");
  else gaps.push("study-level eligibility needs verification");
  if (subjectFit === "direct") reasons.push("subject direction is directly relevant");
  else if (subjectFit === "broad") gaps.push("award is broad; confirm your exact subject is an eligible programme");
  else if (subjectFit === "weak") gaps.push("programme-level subject availability must be confirmed");
  else if (subjectFit === "gap") gaps.push("no subject-specific alignment is recorded");
  if (englishRequirement !== null && profileEnglish !== null) {
    if (profileEnglish < englishRequirement) hardGaps.push(`IELTS ${englishRequirement.toFixed(1)} is required; your stated score is ${profileEnglish.toFixed(1)}`);
    else reasons.push(profileEnglish > englishRequirement ? "English score has headroom" : "English threshold is met without headroom");
  } else if (profile.englishScore) gaps.push("confirm the programme English threshold and band requirements");
  if (gpaRequirement !== null && profileGpa !== null && profileGpa < gpaRequirement) hardGaps.push(`stated GPA threshold appears to be ${gpaRequirement}`);
  else if (academicResult) gaps.push("academic competitiveness still requires holistic review");
  if (deadline.closed) hardGaps.push("listed cycle is closed; monitor the next verified round");
  else if (intakeYear && !containsAny(`${scholarship.intake} ${scholarship.status}`, [intakeYear])) gaps.push("confirm the exact intake window");
  if (/fully funded only/i.test(profile.fundingNeed ?? "") && !/fully funded/i.test(fundingText)) gaps.push("funding may not meet the fully funded preference");
  if (stale) gaps.push("catalogue check is older than 60 days; re-verify before applying");
  if (lowConfidence) gaps.push("catalogue entry is lower-confidence; verify every material fact");

  let score = Object.values(subScores).reduce((total, value) => total + value, 0);
  score = Math.max(18, Math.min(96, Math.round(score)));
  return {
    scholarship, score,
    label: hardGaps.length || score < 64 ? "Reach" : score >= 82 ? "Strong match" : "Possible match",
    rationale: reasons.length ? `${reasons.slice(0, 4).join(", ")}.` : "The catalogue record needs careful verification against this profile.",
    gaps: Array.from(new Set([...hardGaps, ...gaps])).slice(0, 6),
    hardGaps: Array.from(new Set(hardGaps)), subScores,
  };
}

export function rankScholarships(profile: StudentProfile, limit?: number, now = new Date()): ScholarshipMatch[] {
  const preferred = (profile.preferredCountries ?? []).map((country) => country.trim()).filter(Boolean);
  const destinationRows = preferred.length ? scholarshipData.filter((scholarship) => preferred.some((country) => countryMatches(`${scholarship.country} ${scholarship.destination}`, country))) : scholarshipData;
  const candidates = destinationRows.length ? destinationRows : scholarshipData;
  const ranked = candidates.map((scholarship) => scoreOne(profile, scholarship, now)).sort((a, b) => b.score - a.score || a.scholarship.name.localeCompare(b.scholarship.name));
  return typeof limit === "number" ? ranked.slice(0, Math.max(0, limit)) : ranked;
}

/** Create useful decision bands without inventing precision or promoting hard eligibility gaps. */
export function calibrateBestFindBands(matches: ScholarshipMatch[]) {
  let strong = 0;
  let possible = 0;
  return matches.map((match) => {
    let label: ScholarshipMatch["label"] = "Reach";
    if (!match.hardGaps.length && strong < 3) { label = "Strong match"; strong += 1; }
    else if (!match.hardGaps.length && possible < 4) { label = "Possible match"; possible += 1; }
    return { ...match, label };
  });
}

export function buildCountryCoverageNotices(profile: StudentProfile, selected: ScholarshipMatch[]): CountryCoverageNotice[] {
  return (profile.preferredCountries ?? []).flatMap((country) => {
    const countrySelections = selected.filter((match) => countryMatches(`${match.scholarship.country} ${match.scholarship.destination}`, country));
    const specific = scholarshipData.filter((row) => countryMatches(`${row.country} ${row.destination}`, country))
      .filter((row) => studyLevelCompatibility(profile.studyLevel, row.studyLevel) === "aligned" && subjectCompatibility(profile.field, `${row.subjectRestrictions} ${row.category}`) === "direct");
    if (specific.length) return [];
    const broadAlternativeShown = countrySelections.length > 0;
    return [{ country, message: `No ${country} records matched your level and subject.`, alternatives: [
      broadAlternativeShown
        ? `A broader ${country} award appears below as a Reach alternative; verify a ${profile.field || "target-subject"} programme on the university site.`
        : `Review broader ${country} awards and verify a ${profile.field || "target-subject"} programme on the university site.`,
      "Keep this destination selected and add a closely related subject such as apparel, fashion or materials.",
    ] }];
  });
}

export const catalogueCountries: string[] = Array.from(new Set(scholarshipData.map((item) => item.country).filter((country) => country && !/^multiple/i.test(country)))).sort();
export const catalogueIntakes: string[] = Array.from(new Set(scholarshipData.map((item) => item.intake).filter(Boolean))).sort();
export const scholarships = scholarshipData;
