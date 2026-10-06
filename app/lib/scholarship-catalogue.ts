import scholarshipData from "../data/scholarships.json";
import type { Scholarship } from "./matching";
import { database, ensureSchema } from "./storage";

const bundledCatalogue = scholarshipData as Scholarship[];
const CACHE_MS = 60_000;
let cache: { expiresAt: number; rows: Scholarship[]; source: "database" | "bundled" } | null = null;

type CatalogueRow = { dataJson: string };
type StructuredCatalogueRow = {
  id: string;
  name: string;
  provider: string;
  country: string;
  destination: string | null;
  category: string | null;
  fundingSummary: string | null;
  coverage: string | null;
  bangladeshEligibility: string | null;
  officialSource: string;
  sourceDataset: string | null;
  overallSummary: string | null;
  studyLevel: string | null;
  subjectRestrictions: string | null;
  academicCriteria: string | null;
  englishRequirement: string | null;
  separateAdmission: string | null;
  documents: string | null;
  intake: string | null;
  deadline: string | null;
  deadlineTimezone: string | null;
  status: string | null;
  applicationRoute: string | null;
  verifiedAt: string | null;
  confidence: string | null;
  priority: string | null;
};

function fundingCategory(row: Scholarship) {
  const value = `${row.coverage ?? ""} ${row.fundingSummary ?? ""}`.toLowerCase();
  if (/self-funded|self funded/.test(value)) return "Self-funded";
  if (/fully funded/.test(value) || (/\bfull\b/.test(String(row.coverage).toLowerCase()) && /stipend|living|allowance|travel/.test(value))) return "Fully funded";
  if (/100%? tuition|full tuition/.test(value)) return "Full tuition";
  if (/discount|reduction/.test(value)) return "Tuition discount";
  if (/partial|stipend|waiver|toward tuition|up to/.test(value)) return "Partial funding";
  return "Other";
}

function validScholarship(value: unknown): value is Scholarship {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Scholarship>;
  return Boolean(item.id && item.name && item.country && item.officialSource);
}

async function readDatabaseCatalogue() {
  const result = await database().prepare(`SELECT data_json AS dataJson
    FROM scholarship_catalogue WHERE active = 1 ORDER BY source_order, id`).all<CatalogueRow>();
  return (result.results ?? []).flatMap((row) => {
    try {
      const parsed: unknown = JSON.parse(row.dataJson);
      return validScholarship(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

async function readStructuredCatalogue() {
  const result = await database().prepare(`SELECT
      award.id AS id, award.name AS name, award.provider AS provider, award.country AS country,
      award.destination AS destination, award.category AS category, award.funding_summary AS fundingSummary,
      award.coverage AS coverage, award.bangladesh_eligibility AS bangladeshEligibility,
      award.official_source AS officialSource, award.source_dataset AS sourceDataset,
      award.overall_summary AS overallSummary,
      programme.study_level AS studyLevel, programme.subject_restrictions AS subjectRestrictions,
      programme.academic_criteria AS academicCriteria, programme.english_requirement AS englishRequirement,
      programme.separate_admission AS separateAdmission, programme.documents AS documents,
      cycle.intake AS intake, cycle.deadline AS deadline, cycle.deadline_timezone AS deadlineTimezone,
      cycle.status AS status, cycle.application_route AS applicationRoute, cycle.verified_at AS verifiedAt,
      cycle.confidence AS confidence, cycle.priority AS priority
    FROM catalogue_awards award
    LEFT JOIN catalogue_programmes programme ON programme.scholarship_id = award.id
      AND programme.active = 1 AND programme.is_primary = 1
    LEFT JOIN catalogue_cycles cycle ON cycle.scholarship_id = award.id
      AND cycle.active = 1 AND cycle.is_current = 1
    WHERE award.active = 1 ORDER BY award.source_order, award.id`).all<StructuredCatalogueRow>();
  return (result.results ?? []).map((row) => {
    let overallSummary: unknown = row.overallSummary ?? "";
    try {
      if (typeof row.overallSummary === "string" && row.overallSummary.startsWith("{")) {
        overallSummary = JSON.parse(row.overallSummary);
      }
    } catch {
      overallSummary = row.overallSummary ?? "";
    }
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      country: row.country,
      destination: row.destination ?? row.country,
      category: row.category ?? "",
      studyLevel: row.studyLevel ?? "",
      intake: row.intake ?? "",
      fundingSummary: row.fundingSummary ?? "",
      coverage: row.coverage ?? "",
      bangladeshEligibility: row.bangladeshEligibility ?? "",
      academicCriteria: row.academicCriteria ?? "",
      englishRequirement: row.englishRequirement ?? "",
      subjectRestrictions: row.subjectRestrictions ?? "",
      deadline: row.deadline ?? "",
      deadlineTimezone: row.deadlineTimezone ?? "",
      status: row.status ?? "",
      applicationRoute: row.applicationRoute ?? "",
      separateAdmission: row.separateAdmission ?? "",
      documents: row.documents ?? "",
      officialSource: row.officialSource,
      verifiedAt: row.verifiedAt ?? "",
      confidence: row.confidence ?? "",
      priority: row.priority ?? "",
      sourceDataset: row.sourceDataset ?? "",
      overallSummary,
    };
  }) as Scholarship[];
}

async function seedLegacyCatalogue(records: Scholarship[]) {
  const statements = records.map((item, index) => database().prepare(`INSERT INTO scholarship_catalogue
    (id, name, provider, country, funding_category, official_source, deadline, status, verified_at,
      confidence, source_dataset, data_json, active, source_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, provider=excluded.provider, country=excluded.country,
      funding_category=excluded.funding_category, official_source=excluded.official_source,
      deadline=excluded.deadline, status=excluded.status, verified_at=excluded.verified_at,
      confidence=excluded.confidence, source_dataset=excluded.source_dataset, data_json=excluded.data_json,
      active=1, source_order=excluded.source_order, updated_at=CURRENT_TIMESTAMP`)
    .bind(item.id, item.name, item.provider, item.country, fundingCategory(item), item.officialSource,
      item.deadline || null, item.status || null, item.verifiedAt || null, item.confidence || null,
      item.sourceDataset || null, JSON.stringify(item), index));
  for (let offset = 0; offset < statements.length; offset += 50) {
    await database().batch(statements.slice(offset, offset + 50));
  }
}

export async function getScholarshipCatalogue(options: { fresh?: boolean } = {}) {
  if (!options.fresh && cache && cache.expiresAt > Date.now()) return cache.rows;
  try {
    await ensureSchema();
    let legacyRows = await readDatabaseCatalogue();
    if (!legacyRows.length) {
      await seedLegacyCatalogue(bundledCatalogue);
      legacyRows = await readDatabaseCatalogue();
    }
    const structuredRows = await readStructuredCatalogue();
    const rows = structuredRows.length === legacyRows.length ? structuredRows : legacyRows;
    if (rows.length) {
      cache = { expiresAt: Date.now() + CACHE_MS, rows, source: "database" };
      return rows;
    }
  } catch (error) {
    console.error("Scholarship catalogue database unavailable; using bundled fallback", error);
  }
  cache = { expiresAt: Date.now() + 10_000, rows: bundledCatalogue, source: "bundled" };
  return bundledCatalogue;
}

export async function getScholarshipById(id: string) {
  return (await getScholarshipCatalogue()).find((item) => item.id === id) ?? null;
}

export function scholarshipCatalogueSummary(rows: Scholarship[]) {
  return {
    count: rows.length,
    countries: Array.from(new Set(rows.map((item) => item.country).filter((country) => country && !/^multiple/i.test(country)))).sort(),
    intakes: Array.from(new Set(rows.map((item) => item.intake).filter(Boolean))).sort(),
    highConfidenceCount: rows.filter((item) => /high/i.test(item.confidence ?? "")).length,
  };
}

export function bundledScholarshipCatalogue() {
  return bundledCatalogue;
}
