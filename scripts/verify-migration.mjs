import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const tableNames = ["students", "student_accounts", "documents", "document_uploads", "document_upload_parts", "matches", "progress_events", "consultant_requests", "applications", "scholarship_reports"];
const dumpPath = resolve(process.argv[2] || process.env.MIGRATION_DUMP_PATH || ".migration-private/sites-d1-export.json");
const dump = JSON.parse(await readFile(dumpPath, "utf8"));
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dateStrings: true,
});

let failed = false;
try {
  for (const table of tableNames) {
    const expected = Array.isArray(dump.tables?.[table]) ? dump.tables[table].length : 0;
    const [[row]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    const actual = Number(row.count);
    const ok = actual === expected;
    failed ||= !ok;
    console.log(`${ok ? "PASS" : "FAIL"} ${table}: expected ${expected}, found ${actual}`);
  }
  const [[orphans]] = await connection.query(`SELECT COUNT(*) AS count FROM applications a LEFT JOIN students s ON s.email = a.owner_email WHERE s.email IS NULL`);
  const orphanCount = Number(orphans.count);
  failed ||= orphanCount > 0;
  console.log(`${orphanCount === 0 ? "PASS" : "FAIL"} application ownership: ${orphanCount} orphan rows`);
} finally {
  await connection.end();
}

if (failed) process.exitCode = 1;
