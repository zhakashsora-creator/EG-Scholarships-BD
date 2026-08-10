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
        database().prepare(`CREATE TABLE IF NOT EXISTS student_accounts (
          email TEXT PRIMARY KEY, full_name TEXT NOT NULL, address TEXT NOT NULL, mobile TEXT NOT NULL,
          date_of_birth TEXT, nationality TEXT NOT NULL DEFAULT 'Bangladesh', current_institution TEXT,
          photo_storage_key TEXT, photo_mime_type TEXT, photo_version INTEGER NOT NULL DEFAULT 0,
          onboarding_complete INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, category TEXT NOT NULL,
          filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
          storage_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'uploaded',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_email)`),
        database().prepare(`CREATE TABLE IF NOT EXISTS document_uploads (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, category TEXT NOT NULL,
          filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
          storage_key TEXT NOT NULL, total_chunks INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS document_uploads_owner_idx ON document_uploads(owner_email)`),
        database().prepare(`CREATE TABLE IF NOT EXISTS document_upload_parts (
          upload_id TEXT NOT NULL, part_index INTEGER NOT NULL, size_bytes INTEGER NOT NULL,
          storage_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (upload_id, part_index)
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS document_upload_parts_upload_idx ON document_upload_parts(upload_id)`),
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
        database().prepare(`CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, scholarship_id TEXT NOT NULL,
          stage TEXT NOT NULL DEFAULT 'shortlisted', next_action TEXT NOT NULL DEFAULT 'Review eligibility',
          workflow_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(owner_email, scholarship_id)
        )`),
        database().prepare(`CREATE INDEX IF NOT EXISTS applications_owner_idx ON applications(owner_email)`),
        database().prepare(`CREATE UNIQUE INDEX IF NOT EXISTS applications_owner_scholarship_idx ON applications(owner_email, scholarship_id)`),
      ])
      .then(async () => {
        const columns = await database().prepare(`PRAGMA table_info(applications)`).all<{ name: string }>();
        if (!(columns.results ?? []).some((column) => column.name === "workflow_json")) {
          await database().prepare(`ALTER TABLE applications ADD COLUMN workflow_json TEXT NOT NULL DEFAULT '{}'`).run();
        }
      })
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}
