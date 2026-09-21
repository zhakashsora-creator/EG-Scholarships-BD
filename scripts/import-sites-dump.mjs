import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const tables = {
  students: ["email", "full_name", "profile_json", "completeness", "created_at", "updated_at"],
  student_accounts: ["email", "full_name", "address", "mobile", "date_of_birth", "nationality", "current_institution", "photo_storage_key", "photo_mime_type", "photo_version", "onboarding_complete", "created_at", "updated_at"],
  documents: ["id", "owner_email", "category", "filename", "mime_type", "size_bytes", "storage_key", "status", "created_at"],
  document_uploads: ["id", "owner_email", "category", "filename", "mime_type", "size_bytes", "storage_key", "total_chunks", "status", "created_at", "updated_at"],
  document_upload_parts: ["upload_id", "part_index", "size_bytes", "storage_key", "created_at"],
  matches: ["id", "owner_email", "scholarship_id", "rank", "score", "rationale", "gaps_json", "created_at"],
  progress_events: ["id", "owner_email", "stage", "note", "created_at"],
  consultant_requests: ["id", "owner_email", "message", "status", "created_at"],
  applications: ["id", "owner_email", "scholarship_id", "stage", "next_action", "workflow_json", "updated_at"],
  scholarship_reports: ["id", "owner_email", "recipient_email", "status", "snapshot_json", "provider_id", "error_message", "follow_up_consent", "created_at", "sent_at"],
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function dateValue(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? value.replace("T", " ").replace(/Z$/, "").slice(0, 23)
    : value;
}

const dumpPath = resolve(process.argv[2] || process.env.MIGRATION_DUMP_PATH || ".migration-private/sites-d1-export.json");
const dump = JSON.parse(await readFile(dumpPath, "utf8"));
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
  for (const [table, columns] of Object.entries(tables)) {
    const rows = Array.isArray(dump.tables?.[table]) ? dump.tables[table] : [];
    if (!rows.length) continue;
    const updates = columns.map((column) => `\`${column}\`=VALUES(\`${column}\`)`).join(", ");
    const sql = `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${updates}`;
    for (const row of rows) await connection.execute(sql, columns.map((column) => dateValue(row[column] ?? null)));
    console.log(`${table}: imported ${rows.length}`);
  }
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
