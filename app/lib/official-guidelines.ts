import type { Scholarship, StudentProfile } from "./matching";

export type StudentRecord = { category: string; filename: string; status: string };
export type OfficialRequirement = {
  requirement: string;
  status: "matched" | "missing" | "review";
  matchedDocuments: string[];
  note: string;
};

type RequirementTemplate = { requirement: string; categories: string[]; terms?: string[]; note: string; conditional?: boolean };

const VISA_SOURCES: Record<string, { url: string; label: string; requirements: RequirementTemplate[] }> = {
  "united kingdom": {
    url: "https://www.gov.uk/student-visa/documents-you-must-provide",
    label: "UK Visas and Immigration · Student visa documents",
    requirements: [
      { requirement: "Current passport or other valid travel document", categories: ["identity"], terms: ["passport"], note: "Use the passport that will be linked to the visa application and eVisa." },
      { requirement: "Confirmation of Acceptance for Studies (CAS)", categories: ["travel", "correspondence"], terms: ["cas", "acceptance"], note: "The licensed university issues the CAS after its conditions are met." },
      { requirement: "Financial evidence for course fees and living costs", categories: ["financial"], terms: ["bank", "fund", "sponsor", "loan"], note: "Bangladesh is not on the differential-evidence list; check the current amount and 28-day evidence rules on GOV.UK." },
      { requirement: "TB test certificate from a Home Office-approved clinic in Bangladesh", categories: ["travel"], terms: ["tb", "tuberculosis"], note: "Normally required when coming for 6 months or more after living in Bangladesh; use only an approved clinic." },
      { requirement: "ATAS certificate, if the course and subject require it", categories: ["travel", "correspondence"], terms: ["atas"], note: "Conditional for certain postgraduate science, engineering and technology subjects.", conditional: true },
      { requirement: "Sponsor consent letter, if officially sponsored in the previous 12 months", categories: ["financial", "correspondence"], terms: ["consent", "sponsor"], note: "Conditional; the letter must permit the visa application.", conditional: true },
      { requirement: "Parental consent and relationship evidence, if under 18", categories: ["identity", "supporting"], terms: ["birth", "parent", "consent"], note: "Conditional for applicants under 18.", conditional: true },
    ],
  },
  "united states": {
    url: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    label: "U.S. Department of State · Student Visa",
    requirements: [
      { requirement: "Passport valid for travel to the United States", categories: ["identity"], terms: ["passport"], note: "Check the embassy instructions for passport validity and blank pages." },
      { requirement: "Form I-20 issued by the SEVP-approved school", categories: ["travel", "correspondence"], terms: ["i-20", "i20"], note: "Sign the I-20 and ensure the programme and funding details are correct." },
      { requirement: "DS-160 confirmation page", categories: ["travel", "receipts"], terms: ["ds-160", "ds160"], note: "Complete the online nonimmigrant visa application and retain its confirmation." },
      { requirement: "Visa fee and SEVIS I-901 payment records", categories: ["receipts"], terms: ["sevis", "visa fee", "receipt"], note: "Keep both official payment confirmations." },
      { requirement: "Academic preparation and financial-support evidence for the interview", categories: ["academic", "financial"], terms: ["transcript", "bank", "sponsor"], note: "Carry the school-specific and embassy-requested evidence; interview requirements can vary." },
    ],
  },
  canada: {
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html",
    label: "Immigration, Refugees and Citizenship Canada · Study permit documents",
    requirements: [
      { requirement: "Letter of acceptance from a designated learning institution", categories: ["correspondence", "travel"], terms: ["acceptance", "loa"], note: "Upload the official letter issued by the institution." },
      { requirement: "Provincial or territorial attestation letter, unless exempt", categories: ["travel", "correspondence"], terms: ["pal", "tal", "attestation"], note: "Check the current exemption and graduate-student rules before applying.", conditional: true },
      { requirement: "Valid passport and identity evidence", categories: ["identity"], terms: ["passport"], note: "Follow the online checklist for scans, photos and biometrics." },
      { requirement: "Proof of sufficient funds", categories: ["financial"], terms: ["bank", "fund", "sponsor", "loan"], note: "Use IRCC's current tuition, living-cost and transport figures." },
      { requirement: "Medical examination or police certificate if requested", categories: ["travel", "supporting"], terms: ["medical", "police"], note: "Conditional based on residence, travel history and IRCC instructions.", conditional: true },
    ],
  },
  australia: {
    url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/step-by-step",
    label: "Australian Department of Home Affairs · Student visa (subclass 500)",
    requirements: [
      { requirement: "Passport and identity documents", categories: ["identity"], terms: ["passport"], note: "Use the ImmiAccount document checklist generated for the application." },
      { requirement: "Confirmation of Enrolment (CoE)", categories: ["travel", "correspondence"], terms: ["coe", "enrolment"], note: "The education provider issues the CoE after admission and required payments." },
      { requirement: "Genuine Student responses and supporting evidence", categories: ["supporting"], terms: ["genuine", "statement"], note: "Address the current Genuine Student questions with evidence consistent with the profile." },
      { requirement: "Financial capacity evidence when requested", categories: ["financial"], terms: ["bank", "fund", "sponsor"], note: "Use the current Home Affairs figures and acceptable evidence types." },
      { requirement: "Overseas Student Health Cover (OSHC)", categories: ["travel", "receipts"], terms: ["oshc", "insurance"], note: "Coverage normally needs to span the required stay period." },
      { requirement: "English, health, biometrics or character evidence when requested", categories: ["language", "travel", "supporting"], terms: ["ielts", "medical", "police", "biometric"], note: "Conditional requirements are shown in ImmiAccount and the document checklist.", conditional: true },
    ],
  },
};

const GENERIC_VISA_SOURCE = {
  url: "",
  label: "Destination immigration authority · student route",
  requirements: [
    { requirement: "Valid passport and identity photographs", categories: ["identity"], terms: ["passport", "photo"], note: "Confirm validity, blank-page and photo specifications with the destination authority." },
    { requirement: "Official admission, enrolment or sponsorship confirmation", categories: ["correspondence", "travel"], terms: ["offer", "admission", "enrol", "sponsor"], note: "Use the destination's required institutional document." },
    { requirement: "Current student visa application and fee receipt", categories: ["travel", "receipts"], terms: ["visa", "receipt"], note: "Apply only through the official government or embassy route." },
    { requirement: "Proof of tuition and living-cost funds", categories: ["financial"], terms: ["bank", "fund", "sponsor", "loan"], note: "Check the current amount, holding period, currency and sponsor rules." },
    { requirement: "Health, insurance, police or biometric evidence when required", categories: ["travel", "supporting"], terms: ["medical", "insurance", "police", "biometric"], note: "These are destination- and applicant-specific; verify on the official checklist.", conditional: true },
  ],
};

const OFFICIAL_VISA_PORTALS: Record<string, string> = {
  "united arab emirates": "https://u.ae/en/information-and-services/education/higher-education/student-visa",
  netherlands: "https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education",
  germany: "https://www.make-it-in-germany.com/en/visa-residence/types/studying",
  france: "https://france-visas.gouv.fr/en/student",
  sweden: "https://www.migrationsverket.se/en/you-want-to-apply/study/higher-education.html",
  finland: "https://migri.fi/en/studying-in-finland",
  ireland: "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
  "new zealand": "https://www.immigration.govt.nz/visas/fee-paying-student-visa/",
  italy: "https://vistoperitalia.esteri.it/home/en",
  denmark: "https://nyidanmark.dk/en-GB/You-want-to-apply/Study/Higher-Education",
  norway: "https://www.udi.no/en/want-to-apply/studies/studietillatelse/?c=bgd",
  singapore: "https://www.ica.gov.sg/reside/STP/apply",
};

function recordMatches(template: RequirementTemplate, records: StudentRecord[]) {
  return records.filter((record) => template.categories.includes(record.category) && (!template.terms?.length || template.terms.some((term) => record.filename.toLowerCase().includes(term))));
}

function evaluated(template: RequirementTemplate, records: StudentRecord[]): OfficialRequirement {
  const matches = recordMatches(template, records).slice(0, 5);
  return {
    requirement: template.requirement,
    status: matches.length ? "matched" : template.conditional ? "review" : "missing",
    matchedDocuments: matches.map((item) => item.filename),
    note: matches.length ? `${template.note} A filename/category match is stored, but its contents still need review.` : template.note,
  };
}

export function visaGuideline(country: string) {
  const key = country.toLowerCase().trim();
  return VISA_SOURCES[key] ?? {
    ...GENERIC_VISA_SOURCE,
    url: OFFICIAL_VISA_PORTALS[key] ?? "https://www.iom.int/countries/bangladesh",
    label: OFFICIAL_VISA_PORTALS[key] ? `${country} official immigration portal · student route` : `${country} visa requirements · official source must be confirmed`,
  };
}

export function applicationRequirements(scholarship: Scholarship, profile: StudentProfile): RequirementTemplate[] {
  const academicLabel = profile.hasBachelorDegree === "yes"
    ? "Bachelor's transcript, completion certificate and grading-scale evidence"
    : "SSC/O-level and HSC/A-level transcripts and certificates";
  return [
    { requirement: "Valid passport or official identity document", categories: ["identity"], terms: ["passport", "identity", "nid"], note: "Match the name and date of birth across the application and academic records." },
    { requirement: academicLabel, categories: ["academic"], terms: ["transcript", "certificate", "ssc", "hsc", "level", "bachelor"], note: "Follow the programme's rules for official copies, translations, grading scales and final/pending results." },
    { requirement: `Academic eligibility for the selected course: ${scholarship.academicCriteria || "check the course page"}`, categories: ["academic"], note: "The scholarship record is a starting point; the chosen course page controls admission eligibility.", conditional: true },
    { requirement: `English-language evidence: ${scholarship.englishRequirement || "check the course-specific standard"}`, categories: ["language"], terms: ["ielts", "toefl", "pte", "duolingo", "english"], note: "Confirm accepted tests, overall score, component scores and test validity.", conditional: true },
    { requirement: "Statement of purpose, personal statement or scholarship statement", categories: ["supporting"], terms: ["statement", "sop", "motivation"], note: "Use the exact prompt, word limit and authorship rules on the official application." },
    { requirement: "Academic or professional references", categories: ["supporting", "correspondence"], terms: ["reference", "recommendation", "referee"], note: "Confirm the number, referee type and whether referees submit directly.", conditional: true },
    { requirement: "Current CV or résumé", categories: ["supporting"], terms: ["cv", "resume", "résumé"], note: "Include education, research, work and activities relevant to the programme.", conditional: true },
    { requirement: `Award-specific evidence: ${scholarship.documents || scholarship.applicationRoute || "check the official award page"}`, categories: ["supporting", "academic", "correspondence"], note: "Course-specific writing samples, portfolio, research proposal or tests may also apply.", conditional: true },
  ];
}

export function baselineGuideline(phase: "application" | "visa", scholarship: Scholarship, profile: StudentProfile, records: StudentRecord[]) {
  if (phase === "visa") {
    const source = visaGuideline(scholarship.country);
    return { sourceUrl: source.url, sourceLabel: source.label, requirements: source.requirements.map((item) => evaluated(item, records)) };
  }
  return {
    sourceUrl: scholarship.officialSource,
    sourceLabel: `${scholarship.provider} · official application/award source`,
    requirements: applicationRequirements(scholarship, profile).map((item) => evaluated(item, records)),
  };
}
