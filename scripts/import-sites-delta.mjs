import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const tablePolicies = {
  students: {
    columns: ["email", "full_name", "profile_json", "completeness", "created_at", "updated_at"],
    key: "email",
    newerThan: "updated_at",
  },
  student_accounts: {
    columns: ["email", "full_name", "address", "mobile", "date_of_birth", "nationality", "current_institution", "photo_storage_key", "photo_mime_type", "photo_version", "onboarding_complete", "created_at", "updated_at"],
    key: "email",
    newerThan: "updated_at",
  },
  applications: {
    columns: ["id", "owner_email", "scholarship_id", "stage", "next_action", "workflow_json", "updated_at"],
    key: "id",
    newerThan: "updated_at",
  },
  documents: {
    columns: ["id", "owner_email", "category", "filename", "mime_type", "size_bytes", "storage_key", "status", "created_at"],
    key: "id",
  },
  progress_events: {
    columns: ["id", "owner_email", "stage", "note", "created_at"],
    key: "id",
  },
  consultant_requests: {
    columns: ["id", "owner_email", "message", "status", "created_at"],
    key: "id",
  },
  scholarship_reports: {
    columns: ["id", "owner_email", "recipient_email", "status", "snapshot_json", "provider_id", "error_message", "follow_up_consent", "created_at", "sent_at"],
    key: "id",
  },
};

const intentionallySkipped = new Set(["matches", "document_uploads", "document_upload_parts"]);

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

function insertSql(table, policy) {
  const names = policy.columns.map((column) => `\`${column}\``).join(", ");
  const placeholders = policy.columns.map(() => "?").join(", ");
  if (!policy.newerThan) return `INSERT IGNORE INTO \`${table}\` (${names}) VALUES (${placeholders})`;

  const updates = policy.columns
    .filter((column) => column !== policy.key && column !== "created_at")
    .map((column) => `\`${column}\`=IF(VALUES(\`${policy.newerThan}\`) > \`${policy.newerThan}\`, VALUES(\`${column}\`), \`${column}\`)`)
    .join(", ");
  return `INSERT INTO \`${table}\` (${names}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const pathArgument = args.find((argument) => !argument.startsWith("--"));
const dumpPath = resolve(pathArgument || process.env.MIGRATION_DUMP_PATH || ".migration-private/sites-delta.json");
const dump = JSON.parse(await readFile(dumpPath, "utf8"));

for (const table of Object.keys(dump.tables || {})) {
  if (!tablePolicies[table] && !intentionallySkipped.has(table)) throw new Error(`Unsupported delta table: ${table}`);
}

const summary = {};
for (const [table, rows] of Object.entries(dump.tables || {})) {
  summary[table] = { rows: Array.isArray(rows) ? rows.length : 0, action: intentionallySkipped.has(table) ? "skip-derived-or-pending" : tablePolicies[table]?.newerThan ? "merge-if-newer" : "insert-missing" };
}

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, summary }, null, 2));
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
  await connection.beginTransaction();
  for (const [table, rows] of Object.entries(dump.tables || {})) {
    if (intentionallySkipped.has(table) || !Array.isArray(rows) || rows.length === 0) continue;
    const policy = tablePolicies[table];
    const sql = insertSql(table, policy);
    for (const row of rows) {
      if (row[policy.key] == null) throw new Error(`${table} row is missing ${policy.key}`);
      await connection.execute(sql, policy.columns.map((column) => dateValue(row[column] ?? null)));
    }
    console.log(`${table}: safely considered ${rows.length} row${rows.length === 1 ? "" : "s"}`);
  }
  await connection.commit();
  console.log(JSON.stringify({ imported: true, summary }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
