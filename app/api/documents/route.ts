import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, documentBucket, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
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

function normalizedMime(file: File) {
  if (ACCEPTED.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split(".").pop();
  return ({ pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" } as Record<string, string>)[extension ?? ""] ?? "";
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
  const mimeType = normalizedMime(file);
  if (!mimeType) {
    return NextResponse.json({ error: "Use PDF, DOC, DOCX, JPG or PNG files" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Each document must be 20 MB or smaller" }, { status: 400 });
  }

  await ensureSchema();
  const id = crypto.randomUUID();
  const key = `${await ownerPrefix(user.email)}/${id}-${safeFilename(file.name)}`;
  try {
    await documentBucket().put(key, file.stream(), {
      httpMetadata: { contentType: mimeType },
      customMetadata: { category },
    });
    await database().batch([
      database().prepare(`INSERT INTO documents
        (id, owner_email, category, filename, mime_type, size_bytes, storage_key, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')`)
        .bind(id, user.email, category, file.name, mimeType, file.size, key),
      database().prepare(`INSERT INTO progress_events (id, owner_email, stage, note) VALUES (?, ?, 'Document uploaded', ?)`)
        .bind(crypto.randomUUID(), user.email, `${file.name} added to ${category} documents`),
    ]);
  } catch (error) {
    await documentBucket().delete(key).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Storage is temporarily unavailable";
    return NextResponse.json({ error: `Upload could not be completed: ${message}` }, { status: 503 });
  }

  return NextResponse.json({
    document: { id, category, filename: file.name, mimeType, sizeBytes: file.size, status: "ready" },
  });
}

export async function DELETE(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Document ID is required" }, { status: 400 });

  await ensureSchema();
  const document = await database()
    .prepare(`SELECT filename, storage_key AS storageKey FROM documents WHERE id = ? AND owner_email = ?`)
    .bind(id, user.email)
    .first<{ filename: string; storageKey: string }>();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  try {
    await documentBucket().delete(document.storageKey);
    await database().batch([
      database().prepare(`DELETE FROM documents WHERE id = ? AND owner_email = ?`).bind(id, user.email),
      database().prepare(`INSERT INTO progress_events (id, owner_email, stage, note) VALUES (?, ?, 'Document removed', ?)`).bind(
        crypto.randomUUID(), user.email, `${document.filename} removed from the document vault`,
      ),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage is temporarily unavailable";
    return NextResponse.json({ error: `Document could not be removed: ${message}` }, { status: 503 });
  }

  return NextResponse.json({ ok: true, id });
}
