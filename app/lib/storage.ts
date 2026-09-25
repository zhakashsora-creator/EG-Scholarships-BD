import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { ExecuteValues } from "mysql2";
import { createPool, type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { runtimeBinding, runtimeValue } from "./runtime-env";

type QueryRows<T> = { results: T[] };

export interface PreparedStatementLike {
  bind(...values: unknown[]): PreparedStatementLike;
  first<T>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryRows<T>>;
  run(): Promise<unknown>;
}

export interface DatabaseLike {
  prepare(sql: string): PreparedStatementLike;
  batch(statements: PreparedStatementLike[]): Promise<unknown[]>;
}

type BucketObjectLike = {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export interface DocumentBucketLike {
  put(key: string, value: ReadableStream | Blob | ArrayBuffer | ArrayBufferView, options?: unknown): Promise<unknown>;
  get(key: string): Promise<BucketObjectLike | null>;
  delete(key: string): Promise<void>;
}

let mysqlPool: Pool | null = null;
let mysqlDatabase: DatabaseLike | null = null;
let filesystemBucket: DocumentBucketLike | null = null;
let schemaReady: Promise<void> | null = null;

function mysqlConfigPresent() {
  return Boolean(runtimeValue("DATABASE_URL") || (runtimeValue("DB_HOST") && runtimeValue("DB_NAME") && runtimeValue("DB_USER")));
}

function getMysqlPool() {
  if (mysqlPool) return mysqlPool;
  const url = runtimeValue("DATABASE_URL")?.trim();
  mysqlPool = url
    ? createPool({ uri: url, connectionLimit: 4, dateStrings: true, decimalNumbers: true })
    : createPool({
        host: runtimeValue("DB_HOST") || "localhost",
        port: Number(runtimeValue("DB_PORT") || 3306),
        database: runtimeValue("DB_NAME"),
        user: runtimeValue("DB_USER"),
        password: runtimeValue("DB_PASSWORD") || "",
        connectionLimit: 4,
        dateStrings: true,
        decimalNumbers: true,
      });
  return mysqlPool;
}

function normalizeMysqlSql(sql: string) {
  const normalized = sql.trim();
  if (/^INSERT\s+OR\s+REPLACE\s+INTO\s+document_upload_parts/i.test(normalized)) {
    return normalized
      .replace(/^INSERT\s+OR\s+REPLACE/i, "INSERT")
      .concat(" ON DUPLICATE KEY UPDATE size_bytes=VALUES(size_bytes), storage_key=VALUES(storage_key), created_at=CURRENT_TIMESTAMP");
  }
  return normalized.replace(
    /\s+ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+SET\s+([\s\S]+)$/i,
    (_match, assignments: string) => ` ON DUPLICATE KEY UPDATE ${assignments.replace(/\bexcluded\.([a-z_]+)/gi, "VALUES($1)")}`,
  );
}

function mysqlValue(value: unknown): ExecuteValues {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return value.replace("T", " ").replace(/Z$/, "").slice(0, 23);
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || value instanceof Date || value instanceof Uint8Array) return value;
  if (value === undefined) return null;
  return JSON.stringify(value);
}

class MysqlPreparedStatement implements PreparedStatementLike {
  private values: unknown[] = [];

  constructor(readonly sql: string) {}

  bind(...values: unknown[]) {
    const statement = new MysqlPreparedStatement(this.sql);
    statement.values = values;
    return statement;
  }

  private async execute(executor: Pool | PoolConnection = getMysqlPool()) {
    const [result] = await executor.execute(normalizeMysqlSql(this.sql), this.values.map(mysqlValue));
    return result;
  }

  async first<T>() {
    const rows = await this.execute() as RowDataPacket[];
    return (Array.isArray(rows) && rows.length ? rows[0] : null) as T | null;
  }

  async all<T = Record<string, unknown>>() {
    const rows = await this.execute() as RowDataPacket[];
    return { results: (Array.isArray(rows) ? rows : []) as T[] };
  }

  async run() {
    const result = await this.execute() as ResultSetHeader;
    return { success: true, meta: { changes: result.affectedRows ?? 0, last_row_id: result.insertId ?? 0 } };
  }

  async runWith(executor: PoolConnection) {
    const [result] = await executor.execute(normalizeMysqlSql(this.sql), this.values.map(mysqlValue));
    return result;
  }
}

function createMysqlDatabase(): DatabaseLike {
  return {
    prepare(sql) {
      return new MysqlPreparedStatement(sql);
    },
    async batch(statements) {
      const connection = await getMysqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const results = [];
        for (const statement of statements) {
          if (!(statement instanceof MysqlPreparedStatement)) throw new Error("Mixed database runtimes are not supported");
          results.push(await statement.runWith(connection));
        }
        await connection.commit();
        return results;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

function storageRoot() {
  const configured = runtimeValue("DOCUMENT_STORAGE_PATH")?.trim();
  if (!configured || !isAbsolute(configured)) {
    throw new Error("DOCUMENT_STORAGE_PATH must be an absolute private directory outside the public web root");
  }
  return resolve(configured);
}

function storagePath(key: string) {
  const root = storageRoot();
  const target = resolve(root, key.replaceAll("\\", "/"));
  const child = relative(root, target);
  if (!child || child.startsWith("..") || isAbsolute(child)) throw new Error("Invalid document storage key");
  return target;
}

async function toBytes(value: ReadableStream | Blob | ArrayBuffer | ArrayBufferView) {
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(await new Response(value).arrayBuffer());
}

function createFilesystemBucket(): DocumentBucketLike {
  return {
    async put(key, value) {
      const target = storagePath(key);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, await toBytes(value), { mode: 0o600 });
      return { key };
    },
    async get(key) {
      try {
        const bytes = await readFile(storagePath(key));
        const copy = new Uint8Array(bytes);
        return {
          body: new Blob([copy]).stream(),
          async arrayBuffer() {
            return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
          },
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      await rm(storagePath(key), { force: true });
    },
  };
}

export function database() {
  const cloudflare = runtimeBinding<DatabaseLike>("DB");
  if (cloudflare) return cloudflare;
  if (!mysqlConfigPresent()) throw new Error("Database is unavailable: configure MariaDB or a Cloudflare DB binding");
  mysqlDatabase ??= createMysqlDatabase();
  return mysqlDatabase;
}

export function documentBucket() {
  const cloudflare = runtimeBinding<DocumentBucketLike>("DOCUMENTS");
  if (cloudflare) return cloudflare;
  filesystemBucket ??= createFilesystemBucket();
  return filesystemBucket;
}

const sqliteSchema = [
  `CREATE TABLE IF NOT EXISTS students (email TEXT PRIMARY KEY, full_name TEXT, profile_json TEXT NOT NULL DEFAULT '{}', completeness INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS student_accounts (email TEXT PRIMARY KEY, full_name TEXT NOT NULL, address TEXT NOT NULL, mobile TEXT NOT NULL, date_of_birth TEXT, nationality TEXT NOT NULL DEFAULT 'Bangladesh', current_institution TEXT, photo_storage_key TEXT, photo_mime_type TEXT, photo_version INTEGER NOT NULL DEFAULT 0, onboarding_complete INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, category TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, storage_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_email)`,
  `CREATE TABLE IF NOT EXISTS document_uploads (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, category TEXT NOT NULL, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, storage_key TEXT NOT NULL, total_chunks INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS document_uploads_owner_idx ON document_uploads(owner_email)`,
  `CREATE TABLE IF NOT EXISTS document_upload_parts (upload_id TEXT NOT NULL, part_index INTEGER NOT NULL, size_bytes INTEGER NOT NULL, storage_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (upload_id, part_index))`,
  `CREATE INDEX IF NOT EXISTS document_upload_parts_upload_idx ON document_upload_parts(upload_id)`,
  `CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, scholarship_id TEXT NOT NULL, rank INTEGER NOT NULL, score INTEGER NOT NULL, rationale TEXT NOT NULL, gaps_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS matches_owner_idx ON matches(owner_email)`,
  `CREATE TABLE IF NOT EXISTS progress_events (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, stage TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS consultant_requests (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, scholarship_id TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'shortlisted', next_action TEXT NOT NULL DEFAULT 'Review eligibility', workflow_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(owner_email, scholarship_id))`,
  `CREATE INDEX IF NOT EXISTS applications_owner_idx ON applications(owner_email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS applications_owner_scholarship_idx ON applications(owner_email, scholarship_id)`,
  `CREATE TABLE IF NOT EXISTS scholarship_reports (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, recipient_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ready', snapshot_json TEXT NOT NULL, provider_id TEXT, error_message TEXT, follow_up_consent INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, sent_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS scholarship_catalogue (id TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL, country TEXT NOT NULL, funding_category TEXT NOT NULL, official_source TEXT NOT NULL, deadline TEXT, status TEXT, verified_at TEXT, confidence TEXT, source_dataset TEXT, data_json TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, source_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS scholarship_catalogue_country_idx ON scholarship_catalogue(country)`,
  `CREATE INDEX IF NOT EXISTS scholarship_catalogue_funding_idx ON scholarship_catalogue(funding_category)`,
  `CREATE INDEX IF NOT EXISTS scholarship_catalogue_active_idx ON scholarship_catalogue(active, source_order)`,
];

const mysqlSchema = [
  `CREATE TABLE IF NOT EXISTS students (email VARCHAR(320) PRIMARY KEY, full_name VARCHAR(160), profile_json LONGTEXT NOT NULL, completeness INT NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS student_accounts (email VARCHAR(320) PRIMARY KEY, full_name VARCHAR(160) NOT NULL, address VARCHAR(500) NOT NULL, mobile VARCHAR(40) NOT NULL, date_of_birth VARCHAR(10), nationality VARCHAR(100) NOT NULL DEFAULT 'Bangladesh', current_institution VARCHAR(200), photo_storage_key VARCHAR(1024), photo_mime_type VARCHAR(120), photo_version INT NOT NULL DEFAULT 0, onboarding_complete TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS documents (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, category VARCHAR(80) NOT NULL, filename VARCHAR(255) NOT NULL, mime_type VARCHAR(160) NOT NULL, size_bytes BIGINT NOT NULL, storage_key VARCHAR(1024) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'uploaded', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX documents_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS document_uploads (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, category VARCHAR(80) NOT NULL, filename VARCHAR(255) NOT NULL, mime_type VARCHAR(160) NOT NULL, size_bytes BIGINT NOT NULL, storage_key VARCHAR(1024) NOT NULL, total_chunks INT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'pending', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX document_uploads_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS document_upload_parts (upload_id CHAR(36) NOT NULL, part_index INT NOT NULL, size_bytes BIGINT NOT NULL, storage_key VARCHAR(1024) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (upload_id, part_index), INDEX document_upload_parts_upload_idx (upload_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS matches (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, scholarship_id VARCHAR(120) NOT NULL, rank INT NOT NULL, score INT NOT NULL, rationale TEXT NOT NULL, gaps_json LONGTEXT NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX matches_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS progress_events (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, stage VARCHAR(160) NOT NULL, note TEXT NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX progress_events_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS consultant_requests (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, message TEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'requested', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX consultant_requests_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS applications (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, scholarship_id VARCHAR(120) NOT NULL, stage VARCHAR(40) NOT NULL DEFAULT 'shortlisted', next_action VARCHAR(300) NOT NULL DEFAULT 'Review eligibility', workflow_json LONGTEXT NOT NULL, updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), UNIQUE KEY applications_owner_scholarship_idx (owner_email, scholarship_id), INDEX applications_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS scholarship_reports (id CHAR(36) PRIMARY KEY, owner_email VARCHAR(320) NOT NULL, recipient_email VARCHAR(320) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'ready', snapshot_json LONGTEXT NOT NULL, provider_id VARCHAR(255), error_message TEXT, follow_up_consent TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), sent_at DATETIME(3), INDEX scholarship_reports_owner_idx (owner_email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS scholarship_catalogue (id VARCHAR(120) PRIMARY KEY, name VARCHAR(500) NOT NULL, provider VARCHAR(500) NOT NULL, country VARCHAR(160) NOT NULL, funding_category VARCHAR(80) NOT NULL, official_source VARCHAR(1500) NOT NULL, deadline VARCHAR(120), status VARCHAR(255), verified_at VARCHAR(80), confidence VARCHAR(80), source_dataset VARCHAR(255), data_json LONGTEXT NOT NULL, active TINYINT(1) NOT NULL DEFAULT 1, source_order INT NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX scholarship_catalogue_country_idx (country), INDEX scholarship_catalogue_funding_idx (funding_category), INDEX scholarship_catalogue_active_idx (active, source_order)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = database();
      const usingMysql = !runtimeBinding<DatabaseLike>("DB");
      for (const statement of usingMysql ? mysqlSchema : sqliteSchema) await db.prepare(statement).run();
      if (!usingMysql) {
        const columns = await db.prepare(`PRAGMA table_info(applications)`).all<{ name: string }>();
        if (!(columns.results ?? []).some((column) => column.name === "workflow_json")) {
          await db.prepare(`ALTER TABLE applications ADD COLUMN workflow_json TEXT NOT NULL DEFAULT '{}'`).run();
        }
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
