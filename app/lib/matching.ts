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

function contains(haystack: string, needle?: string) {
  return Boolean(needle && haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase()));
}

function tokens(value?: string) {
  return (value ?? "")
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((item) => item.length > 2);
}

export function rankScholarships(profile: StudentProfile, limit = 5): ScholarshipMatch[] {
  return scholarshipData
    .map((scholarship) => {
      let score = 28;
      const reasons: string[] = [];
      const gaps: string[] = [];
      const levelText = `${scholarship.studyLevel} ${scholarship.academicCriteria}`;
      const countryText = `${scholarship.country} ${scholarship.destination}`;
      const fieldText = `${scholarship.subjectRestrictions} ${scholarship.category}`;
      const statusText = `${scholarship.status} ${scholarship.priority}`.toLocaleLowerCase();

      if (contains(levelText, profile.studyLevel)) {
        score += 22;
        reasons.push("study level aligns");
      } else if (profile.studyLevel) {
        gaps.push("confirm study-level eligibility");
      }

      if (profile.preferredCountries?.some((country) => contains(countryText, country))) {
        score += 16;
        reasons.push("preferred destination");
      } else if (profile.preferredCountries?.length) {
        score -= 4;
      }

      const fieldOverlap = tokens(profile.field).filter((token) => tokens(fieldText).includes(token));
      if (fieldOverlap.length) {
        score += Math.min(14, 6 + fieldOverlap.length * 2);
        reasons.push("subject direction is relevant");
      } else if (profile.field && !contains(fieldText, "any")) {
        gaps.push("verify programme or subject restrictions");
      }

      if (/fully funded/i.test(`${scholarship.coverage} ${scholarship.fundingSummary}`)) {
        score += 10;
        reasons.push("strong funding coverage");
      } else if (/partial|tuition/i.test(`${scholarship.coverage} ${scholarship.fundingSummary}`)) {
        score += 5;
      }

      if (/open|act now|automatic|rolling/.test(statusText)) {
        score += 8;
        reasons.push("actionable or rolling cycle");
      } else if (/annual|monitor|closed/.test(statusText)) {
        gaps.push("current cycle must be re-verified");
      }

      if (/bangladesh|international|worldwide/i.test(scholarship.bangladeshEligibility)) {
        score += 7;
        reasons.push("Bangladesh eligibility is documented");
      } else {
        gaps.push("confirm Bangladesh eligibility on the official page");
      }

      if (scholarship.officialSource) score += 3;
      score = Math.max(35, Math.min(96, Math.round(score)));

      return {
        scholarship,
        score,
        label: score >= 78 ? "Strong match" : score >= 62 ? "Possible match" : "Review required",
        rationale: reasons.length
          ? `${reasons.slice(0, 3).join(", ")}.`
          : "Potential fit identified from the available profile fields.",
        gaps: gaps.slice(0, 3),
      } satisfies ScholarshipMatch;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const scholarships = scholarshipData;
