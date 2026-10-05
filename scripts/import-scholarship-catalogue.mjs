import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";
import { fundingCategory, normalizeCatalogueRecord, validateCatalogueRecords } from "./catalogue-structure.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inputArgument = args.find((value) => !value.startsWith("--"));
const inputPath = resolve(inputArgument || "app/data/scholarships.json");
const records = validateCatalogueRecords(JSON.parse(await readFile(inputPath, "utf8")));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (dryRun) {
  console.log(`PASS ${records.length} catalogue records validated and normalized from ${inputPath}`);
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: required("DB_NAME"),
  user: required("DB_USER"),
  password: required("DB_PASSWORD"),
  dateStrings: true,
});

try {
  const schema = await readFile(new URL("./mysql-schema.sql", import.meta.url), "utf8");
  for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) await connection.query(statement);
  await connection.beginTransaction();
  const sql = `INSERT INTO scholarship_catalogue
    (id, name, provider, country, funding_category, official_source, deadline, status, verified_at, confidence, source_dataset, data_json, active, source_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE name=VALUES(name), provider=VALUES(provider), country=VALUES(country), funding_category=VALUES(funding_category), official_source=VALUES(official_source), deadline=VALUES(deadline), status=VALUES(status), verified_at=VALUES(verified_at), confidence=VALUES(confidence), source_dataset=VALUES(source_dataset), data_json=VALUES(data_json), active=1, source_order=VALUES(source_order), updated_at=CURRENT_TIMESTAMP(3)`;
  const awardSql = `INSERT INTO catalogue_awards
    (id, name, provider, country, destination, category, funding_category, funding_summary, coverage,
      bangladesh_eligibility, official_source, source_dataset, active, source_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE name=VALUES(name), provider=VALUES(provider), country=VALUES(country),
      destination=VALUES(destination), category=VALUES(category), funding_category=VALUES(funding_category),
      funding_summary=VALUES(funding_summary), coverage=VALUES(coverage), bangladesh_eligibility=VALUES(bangladesh_eligibility),
      official_source=VALUES(official_source), source_dataset=VALUES(source_dataset), active=1,
      source_order=VALUES(source_order), updated_at=CURRENT_TIMESTAMP(3)`;
  const programmeSql = `INSERT INTO catalogue_programmes
    (id, scholarship_id, name, study_level, subject_restrictions, academic_criteria, english_requirement,
      separate_admission, documents, official_source, is_primary, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE scholarship_id=VALUES(scholarship_id), name=VALUES(name), study_level=VALUES(study_level),
      subject_restrictions=VALUES(subject_restrictions), academic_criteria=VALUES(academic_criteria),
      english_requirement=VALUES(english_requirement), separate_admission=VALUES(separate_admission),
      documents=VALUES(documents), official_source=VALUES(official_source), is_primary=1, active=1,
      updated_at=CURRENT_TIMESTAMP(3)`;
  const cycleSql = `INSERT INTO catalogue_cycles
    (id, scholarship_id, intake, deadline, deadline_timezone, status, application_route, verified_at,
      confidence, priority, is_current, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE scholarship_id=VALUES(scholarship_id), intake=VALUES(intake), deadline=VALUES(deadline),
      deadline_timezone=VALUES(deadline_timezone), status=VALUES(status), application_route=VALUES(application_route),
      verified_at=VALUES(verified_at), confidence=VALUES(confidence), priority=VALUES(priority), is_current=1,
      active=1, updated_at=CURRENT_TIMESTAMP(3)`;
  for (const [index, record] of records.entries()) {
    const { award, programme, cycle } = normalizeCatalogueRecord(record, index);
    await connection.execute(sql, [
      record.id,
      record.name,
      record.provider,
      record.country,
      fundingCategory(record),
      record.officialSource,
      record.deadline || null,
      record.status || null,
      record.verifiedAt || null,
      record.confidence || null,
      record.sourceDataset || null,
      JSON.stringify(record),
      index,
    ]);
    await connection.execute(awardSql, [
      award.id, award.name, award.provider, award.country, award.destination, award.category,
      award.fundingCategory, award.fundingSummary, award.coverage, award.bangladeshEligibility,
      award.officialSource, award.sourceDataset || null, award.sourceOrder,
    ]);
    await connection.execute(programmeSql, [
      programme.id, programme.scholarshipId, programme.name, programme.studyLevel,
      programme.subjectRestrictions, programme.academicCriteria, programme.englishRequirement,
      programme.separateAdmission, programme.documents, programme.officialSource,
    ]);
    await connection.execute(cycleSql, [
      cycle.id, cycle.scholarshipId, cycle.intake, cycle.deadline || null, cycle.deadlineTimezone,
      cycle.status, cycle.applicationRoute, cycle.verifiedAt || null, cycle.confidence, cycle.priority,
    ]);
  }
  await connection.commit();
  const [[legacy]] = await connection.query("SELECT COUNT(*) AS count FROM scholarship_catalogue WHERE active = 1");
  const [[awards]] = await connection.query("SELECT COUNT(*) AS count FROM catalogue_awards WHERE active = 1");
  const [[programmes]] = await connection.query("SELECT COUNT(*) AS count FROM catalogue_programmes WHERE active = 1");
  const [[cycles]] = await connection.query("SELECT COUNT(*) AS count FROM catalogue_cycles WHERE active = 1");
  console.log(`Imported ${records.length} records; active rows: ${Number(awards.count)} awards, ${Number(programmes.count)} programmes, ${Number(cycles.count)} cycles. Legacy rollback table: ${Number(legacy.count)} records.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
