import scholarshipData from "../data/scholarships.json";

export type Scholarship = (typeof scholarshipData)[number];

export type StudentProfile = {
  studyLevel?: string;
  preferredCountries?: string[];
  field?: string;
  gpa?: string;
  englishTest?: string;
  englishScore?: string;
  budget?: string;
  intake?: string;
  workExperience?: string;
  notes?: string;
};

export type ScholarshipMatch = {
  scholarship: Scholarship;
  score: number;
  label: "Strong match" | "Possible match" | "Review required";
  rationale: string;
  gaps: string[];
};

function normalize(value?: string) {
  return (value ?? "").toLocaleLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9.]+/g, " ").trim();
}

function tokens(value?: string) {
  return normalize(value).split(/\s+/).filter((item) => item.length > 2);
}

function containsAny(haystack: string, needles: string[]) {
  const normalized = normalize(haystack);
  return needles.some((needle) => normalized.includes(normalize(needle)));
}

function numericValue(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function levelTerms(level?: string) {
  const value = normalize(level);
  if (/bachelor|undergraduate/.test(value)) return ["bachelor", "undergraduate", "ug"];
  if (/master|postgraduate/.test(value)) return ["master", "masters", "postgraduate", "pg"];
  if (/doctoral|doctorate|phd/.test(value)) return ["doctoral", "doctorate", "phd", "research"];
  return tokens(level);
}

function explicitRequirement(text: string, label: "gpa" | "ielts") {
  const pattern = label === "gpa"
    ? /(?:gpa|cgpa)[^0-9]{0,18}(\d(?:\.\d+)?)/i
    : /ielts[^0-9]{0,18}(\d(?:\.\d+)?)/i;
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function deadlineState(scholarship: Scholarship, now: Date) {
  const status = normalize(`${scholarship.status} ${scholarship.deadlineTimezone}`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(scholarship.deadline ?? "")
    ? new Date(`${scholarship.deadline}T23:59:59Z`)
    : null;
  const explicitlyClosed = /closed|expired|past deadline/.test(status);
  const past = Boolean(date && date.getTime() < now.getTime());
  return { date, closed: explicitlyClosed || past };
}

export function rankScholarships(profile: StudentProfile, limit = 5, now = new Date()): ScholarshipMatch[] {
  const profileGpa = numericValue(profile.gpa);
  const profileEnglish = numericValue(profile.englishScore);
  const intakeYear = profile.intake?.match(/20\d{2}/)?.[0];

  return scholarshipData
    .map((scholarship) => {
      let score = 30;
      let hardGap = false;
      const reasons: string[] = [];
      const gaps: string[] = [];
      const levelText = `${scholarship.studyLevel} ${scholarship.academicCriteria}`;
      const countryText = `${scholarship.country} ${scholarship.destination}`;
      const fieldText = `${scholarship.subjectRestrictions} ${scholarship.category}`;
      const eligibilityText = scholarship.bangladeshEligibility ?? "";
      const statusText = normalize(`${scholarship.status} ${scholarship.priority}`);
      const deadline = deadlineState(scholarship, now);

      if (/bangladesh|international|worldwide|all nationalit/.test(normalize(eligibilityText))) {
        score += 14;
        reasons.push("Bangladesh eligibility is documented");
      } else {
        score -= 24;
        hardGap = true;
        gaps.push("confirm Bangladesh eligibility on the official page");
      }

      const levels = levelTerms(profile.studyLevel);
      if (levels.length && containsAny(levelText, levels)) {
        score += 20;
        reasons.push("target study level aligns");
      } else if (levels.length) {
        score -= 16;
        hardGap = true;
        gaps.push("study-level eligibility does not clearly align");
      }

      if (profile.preferredCountries?.length) {
        if (profile.preferredCountries.some((country) => containsAny(countryText, [country]))) {
          score += 15;
          reasons.push("preferred destination aligns");
        } else {
          score -= 5;
        }
      }

      const profileFieldTokens = tokens(profile.field);
      const scholarshipFieldTokens = new Set(tokens(fieldText));
      const overlap = profileFieldTokens.filter((token) => scholarshipFieldTokens.has(token));
      if (overlap.length) {
        score += Math.min(14, 8 + overlap.length * 2);
        reasons.push("subject direction is relevant");
      } else if (profile.field && /all eligible|all fields|any field|unrestricted/.test(normalize(fieldText))) {
        score += 6;
        reasons.push("broad subject eligibility");
      } else if (profile.field) {
        score -= 5;
        gaps.push("verify programme or subject restrictions");
      }

      if (intakeYear) {
        if (containsAny(`${scholarship.intake} ${scholarship.status}`, [intakeYear])) {
          score += 10;
          reasons.push("target intake aligns");
        } else if (/annual|rolling|course specific|research intake/.test(normalize(`${scholarship.intake} ${scholarship.status}`))) {
          score += 3;
          gaps.push("confirm the exact intake window");
        } else {
          score -= 6;
          gaps.push("target intake needs confirmation");
        }
      }

      const gpaRequirement = explicitRequirement(scholarship.academicCriteria ?? "", "gpa");
      if (profileGpa !== null && gpaRequirement !== null) {
        if (profileGpa >= gpaRequirement) {
          score += 7;
          reasons.push("stated GPA threshold is met");
        } else {
          score -= 14;
          hardGap = true;
          gaps.push(`stated GPA threshold appears to be ${gpaRequirement}`);
        }
      } else if (profile.gpa) {
        gaps.push("academic competitiveness requires manual review");
      }

      const englishRequirement = explicitRequirement(scholarship.englishRequirement ?? "", "ielts");
      if (profileEnglish !== null && englishRequirement !== null) {
        if (profileEnglish >= englishRequirement) {
          score += 7;
          reasons.push("stated English threshold is met");
        } else {
          score -= 12;
          hardGap = true;
          gaps.push(`stated IELTS threshold appears to be ${englishRequirement}`);
        }
      } else if (profile.englishScore && scholarship.englishRequirement) {
        gaps.push("confirm test equivalency and band requirements");
      }

      const fundingText = `${scholarship.coverage} ${scholarship.fundingSummary}`;
      if (/fully funded/i.test(fundingText)) {
        score += 10;
        reasons.push("strong funding coverage");
      } else if (/partial|tuition|stipend/i.test(fundingText)) {
        score += 5;
      }

      if (deadline.closed) {
        score -= 32;
        hardGap = true;
        gaps.push("listed cycle is closed; monitor the next verified round");
      } else if (/open|act now|automatic|rolling/.test(statusText)) {
        score += 10;
        reasons.push("current or rolling application route");
      } else if (/annual|monitor/.test(statusText)) {
        score += 2;
        gaps.push("current cycle and deadline must be re-verified");
      }

      if (deadline.date && !deadline.closed) {
        const days = (deadline.date.getTime() - now.getTime()) / 86_400_000;
        if (days <= 240) score += 6;
      }
      if (scholarship.officialSource) score += 4;
      if (/high/i.test(scholarship.confidence ?? "")) score += 4;
      if (/^a$/i.test(scholarship.priority ?? "")) score += 3;

      score = Math.max(20, Math.min(97, Math.round(score)));
      const label: ScholarshipMatch["label"] = !hardGap && score >= 80
        ? "Strong match"
        : !hardGap && score >= 64
          ? "Possible match"
          : "Review required";

      return {
        scholarship,
        score,
        label,
        rationale: reasons.length
          ? `${reasons.slice(0, 4).join(", ")}.`
          : "Potential fit identified from the available profile fields; consultant verification is required.",
        gaps: Array.from(new Set(gaps)).slice(0, 4),
      } satisfies ScholarshipMatch;
    })
    .sort((a, b) => b.score - a.score || a.scholarship.name.localeCompare(b.scholarship.name))
    .slice(0, limit);
}

export const scholarships = scholarshipData;
