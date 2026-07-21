import { env } from "cloudflare:workers";

let schemaReady: Promise<void> | null = null;

export function database() {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export function documentBucket() {
  if (!env.DOCUMENTS) throw new Error("Document storage is unavailable");
  return env.DOCUMENTS;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = database()
      .batch([
        database().prepare(`CREATE TABLE IF NOT EXISTS students (
          email TEXT PRIMARY KEY, full_name TEXT, profile_json TEXT NOT NULL DEFAULT '{}',
          completeness INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, category TEXT NOT NULL,
          filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
          storage_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_email)`),
        database().prepare(`CREATE TABLE IF NOT EXISTS matches (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, scholarship_id TEXT NOT NULL,
          rank INTEGER NOT NULL, score INTEGER NOT NULL, rationale TEXT NOT NULL,
          gaps_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS matches_owner_idx ON matches(owner_email)`),
        database().prepare(`CREATE TABLE IF NOT EXISTS progress_events (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, stage TEXT NOT NULL,
          note TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE TABLE IF NOT EXISTS consultant_requests (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, message TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
      ])
      .then(() => undefined);
  }
  return schemaReady;
}
