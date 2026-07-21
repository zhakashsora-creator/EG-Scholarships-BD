import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, documentBucket, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
}

async function ownerPrefix(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const result = await database()
    .prepare(`SELECT id, category, filename, mime_type AS mimeType, size_bytes AS sizeBytes,
      status, created_at AS createdAt FROM documents WHERE owner_email = ? ORDER BY created_at DESC`)
    .bind(user.email)
    .all();
  return NextResponse.json({ documents: result.results });
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "other").slice(0, 40);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a document to upload" }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: "Use PDF, DOC, DOCX, JPG or PNG files" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Each document must be 10 MB or smaller" }, { status: 400 });
  }

  await ensureSchema();
  const id = crypto.randomUUID();
  const key = `${await ownerPrefix(user.email)}/${id}-${safeFilename(file.name)}`;
  await documentBucket().put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { ownerEmail: user.email, category },
  });
  await database()
    .prepare(`INSERT INTO documents
      (id, owner_email, category, filename, mime_type, size_bytes, storage_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'uploaded')`)
    .bind(id, user.email, category, file.name, file.type, file.size, key)
    .run();

  return NextResponse.json({
    document: { id, category, filename: file.name, mimeType: file.type, sizeBytes: file.size, status: "uploaded" },
  });
}
