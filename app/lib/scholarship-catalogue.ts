import scholarshipData from "../data/scholarships.json";
import type { Scholarship } from "./matching";
import { database, ensureSchema } from "./storage";

const bundledCatalogue = scholarshipData as Scholarship[];
const CACHE_MS = 60_000;
let cache: { expiresAt: number; rows: Scholarship[]; source: "database" | "bundled" } | null = null;

type CatalogueRow = { dataJson: string };

function fundingCategory(row: Scholarship) {
  const value = `${row.coverage ?? ""} ${row.fundingSummary ?? ""}`.toLowerCase();
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

async function seedBundledCatalogue() {
  const statements = bundledCatalogue.map((item, index) => database().prepare(`INSERT INTO scholarship_catalogue
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
    let rows = await readDatabaseCatalogue();
    if (!rows.length) {
      await seedBundledCatalogue();
      rows = await readDatabaseCatalogue();
    }
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
