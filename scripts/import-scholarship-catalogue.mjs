import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inputArgument = args.find((value) => !value.startsWith("--"));
const inputPath = resolve(inputArgument || "app/data/scholarships.json");
const records = JSON.parse(await readFile(inputPath, "utf8"));

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function fundingCategory(record) {
  const text = `${record.coverage || ""} ${record.fundingSummary || ""}`.toLowerCase();
  if (/fully funded|full tuition.*living|tuition.*stipend|stipend.*tuition/.test(text)) return "Fully funded";
  if (/full tuition|100% tuition|tuition waiver/.test(text)) return "Full tuition";
  if (/discount|fee reduction/.test(text)) return "Tuition discount";
  if (/partial|contribution|stipend|grant|allowance/.test(text)) return "Partial funding";
  return "Other";
}

if (!Array.isArray(records) || records.length === 0) throw new Error("The catalogue must be a non-empty JSON array");
const ids = new Set();
for (const [index, record] of records.entries()) {
  for (const field of ["id", "name", "provider", "country", "officialSource"]) {
    if (typeof record[field] !== "string" || !record[field].trim()) throw new Error(`Record ${index + 1} is missing ${field}`);
  }
  if (ids.has(record.id)) throw new Error(`Duplicate scholarship id: ${record.id}`);
  ids.add(record.id);
  if (!record.officialSource.startsWith("https://")) throw new Error(`${record.id} must use an HTTPS official source`);
}

if (dryRun) {
  console.log(`PASS ${records.length} catalogue records validated from ${inputPath}`);
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
  for (const [index, record] of records.entries()) {
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
  }
  await connection.commit();
  const [[row]] = await connection.query("SELECT COUNT(*) AS count FROM scholarship_catalogue WHERE active = 1");
  console.log(`Imported ${records.length} scholarship records; database now has ${Number(row.count)} active records.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
