import type { Scholarship, StudentProfile } from "./matching";

type OfficialCourse = { name: string; level: string; university: string; url: string; why: string };

const CATALOGUES: Array<[RegExp, string]> = [
  [/ox\.ac\.uk$/, "https://www.ox.ac.uk/admissions/graduate/courses"],
  [/cam\.ac\.uk$/, "https://www.postgraduate.study.cam.ac.uk/courses"],
  [/imperial\.ac\.uk$/, "https://www.imperial.ac.uk/study/courses/"],
  [/ucl\.ac\.uk$/, "https://www.ucl.ac.uk/prospective-students/graduate/taught-degrees"],
  [/anu\.edu\.au$/, "https://programsandcourses.anu.edu.au/"],
  [/unimelb\.edu\.au$/, "https://study.unimelb.edu.au/find/courses/"],
  [/uq\.edu\.au$/, "https://study.uq.edu.au/study-options/programs"],
  [/unsw\.edu\.au$/, "https://www.unsw.edu.au/study"],
  [/sydney\.edu\.au$/, "https://www.sydney.edu.au/courses/"],
  [/harvard\.edu$/, "https://www.harvard.edu/programs/"],
  [/stanford\.edu$/, "https://gradadmissions.stanford.edu/explore-programs"],
  [/mit\.edu$/, "https://oge.mit.edu/graduate-admissions/programs/"],
];

function catalogueFor(source: string) {
  try {
    const host = new URL(source).hostname.toLowerCase().replace(/^www\./, "");
    return CATALOGUES.find(([pattern]) => pattern.test(host))?.[1] ?? source;
  } catch {
    return source;
  }
}

export function officialCourseFallback(scholarship: Scholarship, profile: StudentProfile): OfficialCourse[] {
  const field = profile.field || profile.bachelorSubject || "eligible subjects";
  const level = profile.studyLevel || scholarship.studyLevel;
  const catalogue = catalogueFor(scholarship.officialSource);
  const items: OfficialCourse[] = [{
    name: `Browse ${field} programmes for ${level}`,
    level,
    university: scholarship.provider,
    url: catalogue,
    why: `Official programme catalogue selected for your ${field} and ${level} profile. Use its filters, then confirm that the chosen course is covered by this award.`,
  }];
  if (catalogue !== scholarship.officialSource) {
    items.push({
      name: "Courses covered by this scholarship or discount",
      level: scholarship.studyLevel,
      university: scholarship.provider,
      url: scholarship.officialSource,
      why: "The official award page controls participating courses, separate-admission rules and scholarship eligibility.",
    });
  }
  return items;
}
