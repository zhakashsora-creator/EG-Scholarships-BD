import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import {
  DOCUMENT_CHUNK_BYTES,
  MAX_DOCUMENT_BYTES,
  documentChunkKey,
  documentOwnerPrefix,
  normalizedDocumentMime,
  safeDocumentFilename,
} from "../../lib/document-uploads";
import { database, documentBucket, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

type StartPayload = {
  category?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
};

type UploadRow = { id: string; totalChunks: number };

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const payload = (await request.json().catch(() => null)) as StartPayload | null;
  const filename = typeof payload?.filename === "string" ? payload.filename.trim() : "";
  const suppliedMime = typeof payload?.mimeType === "string" ? payload.mimeType : "";
  const sizeBytes = typeof payload?.sizeBytes === "number" ? payload.sizeBytes : 0;
  const category = typeof payload?.category === "string" ? payload.category.trim().slice(0, 40) : "other";
  const mimeType = normalizedDocumentMime(filename, suppliedMime);

  if (!filename || filename.length > 180 || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json({ error: "Choose a valid document to upload" }, { status: 400 });
  }
  if (!mimeType) {
    return NextResponse.json({ error: "Use PDF, DOC, DOCX, JPG or PNG files" }, { status: 400 });
  }
  if (sizeBytes > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "Each document must be 20 MB or smaller" }, { status: 400 });
  }

  await ensureSchema();
  const uploadId = crypto.randomUUID();
  const storageKey = `${await documentOwnerPrefix(user.email)}/${uploadId}-${safeDocumentFilename(filename)}`;
  const totalChunks = Math.ceil(sizeBytes / DOCUMENT_CHUNK_BYTES);
  await database().prepare(`INSERT INTO document_uploads
    (id, owner_email, category, filename, mime_type, size_bytes, storage_key, total_chunks, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`)
    .bind(uploadId, user.email, category || "other", filename, mimeType, sizeBytes, storageKey, totalChunks)
    .run();

  return NextResponse.json({ uploadId, chunkSize: DOCUMENT_CHUNK_BYTES, totalChunks });
}

export async function DELETE(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const uploadId = new URL(request.url).searchParams.get("uploadId")?.trim();
  if (!uploadId) return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });

  await ensureSchema();
  const upload = await database().prepare(`SELECT id, total_chunks AS totalChunks
    FROM document_uploads WHERE id = ? AND owner_email = ?`)
    .bind(uploadId, user.email)
    .first<UploadRow>();
  if (!upload) return NextResponse.json({ ok: true });

  await Promise.all(
    Array.from({ length: upload.totalChunks }, (_, index) => documentBucket().delete(documentChunkKey(uploadId, index)).catch(() => undefined)),
  );
  await database().batch([
    database().prepare("DELETE FROM document_upload_parts WHERE upload_id = ?").bind(uploadId),
    database().prepare("DELETE FROM document_uploads WHERE id = ? AND owner_email = ?").bind(uploadId, user.email),
  ]);
  return NextResponse.json({ ok: true });
}
