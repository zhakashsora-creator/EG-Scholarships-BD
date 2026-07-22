import { NextResponse } from "next/server";
import { getStudentUser } from "../../../lib/auth";
import { documentChunkKey } from "../../../lib/document-uploads";
import { database, documentBucket, ensureSchema } from "../../../lib/storage";

export const dynamic = "force-dynamic";

type UploadRow = {
  id: string;
  category: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  totalChunks: number;
};

type PartsSummary = { count: number; sizeBytes: number };

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { uploadId?: unknown } | null;
  const uploadId = typeof body?.uploadId === "string" ? body.uploadId.trim() : "";
  if (!uploadId) return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });

  await ensureSchema();
  const upload = await database().prepare(`SELECT id, category, filename, mime_type AS mimeType,
    size_bytes AS sizeBytes, storage_key AS storageKey, total_chunks AS totalChunks
    FROM document_uploads WHERE id = ? AND owner_email = ? AND status = 'pending'`)
    .bind(uploadId, user.email)
    .first<UploadRow>();
  if (!upload) return NextResponse.json({ error: "Upload session was not found" }, { status: 404 });

  const summary = await database().prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS sizeBytes
    FROM document_upload_parts WHERE upload_id = ?`)
    .bind(uploadId)
    .first<PartsSummary>();
  if (!summary || summary.count !== upload.totalChunks || summary.sizeBytes !== upload.sizeBytes) {
    return NextResponse.json({ error: "Some upload parts are missing. Please retry the upload." }, { status: 409 });
  }

  const bucket = documentBucket();
  const buffers: ArrayBuffer[] = [];
  try {
    for (let index = 0; index < upload.totalChunks; index += 1) {
      const part = await bucket.get(documentChunkKey(uploadId, index));
      if (!part) throw new Error(`Upload part ${index + 1} is unavailable`);
      buffers.push(await part.arrayBuffer());
    }
    await bucket.put(upload.storageKey, new Blob(buffers, { type: upload.mimeType }), {
      httpMetadata: { contentType: upload.mimeType },
      customMetadata: { category: upload.category },
    });
    try {
      await database().batch([
        database().prepare(`INSERT INTO documents
          (id, owner_email, category, filename, mime_type, size_bytes, storage_key, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ready')`)
          .bind(upload.id, user.email, upload.category, upload.filename, upload.mimeType, upload.sizeBytes, upload.storageKey),
        database().prepare(`INSERT INTO progress_events (id, owner_email, stage, note)
          VALUES (?, ?, 'Document uploaded', ?)`)
          .bind(crypto.randomUUID(), user.email, `${upload.filename} added to ${upload.category} documents`),
        database().prepare("DELETE FROM document_upload_parts WHERE upload_id = ?").bind(uploadId),
        database().prepare("DELETE FROM document_uploads WHERE id = ? AND owner_email = ?").bind(uploadId, user.email),
      ]);
    } catch (error) {
      await bucket.delete(upload.storageKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage is temporarily unavailable";
    return NextResponse.json({ error: `Upload could not be completed: ${message}` }, { status: 503 });
  }

  await Promise.all(
    Array.from({ length: upload.totalChunks }, (_, index) => bucket.delete(documentChunkKey(uploadId, index)).catch(() => undefined)),
  );
  return NextResponse.json({
    document: {
      id: upload.id,
      category: upload.category,
      filename: upload.filename,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      status: "ready",
    },
  });
}
