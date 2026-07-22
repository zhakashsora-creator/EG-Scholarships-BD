import { NextResponse } from "next/server";
import { getStudentUser } from "../../../lib/auth";
import { DOCUMENT_CHUNK_BYTES, documentChunkKey } from "../../../lib/document-uploads";
import { database, documentBucket, ensureSchema } from "../../../lib/storage";

export const dynamic = "force-dynamic";

type UploadRow = { sizeBytes: number; totalChunks: number };

export async function PUT(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId")?.trim();
  const partIndex = Number(url.searchParams.get("index"));
  if (!uploadId || !Number.isInteger(partIndex) || partIndex < 0) {
    return NextResponse.json({ error: "Invalid upload part" }, { status: 400 });
  }

  await ensureSchema();
  const upload = await database().prepare(`SELECT size_bytes AS sizeBytes, total_chunks AS totalChunks
    FROM document_uploads WHERE id = ? AND owner_email = ? AND status = 'pending'`)
    .bind(uploadId, user.email)
    .first<UploadRow>();
  if (!upload || partIndex >= upload.totalChunks) {
    return NextResponse.json({ error: "Upload session was not found" }, { status: 404 });
  }

  const expectedSize = partIndex === upload.totalChunks - 1
    ? upload.sizeBytes - DOCUMENT_CHUNK_BYTES * partIndex
    : DOCUMENT_CHUNK_BYTES;
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength !== expectedSize) {
    return NextResponse.json({ error: "This upload part is incomplete. Please retry it." }, { status: 400 });
  }

  const storageKey = documentChunkKey(uploadId, partIndex);
  await documentBucket().put(storageKey, bytes, { httpMetadata: { contentType: "application/octet-stream" } });
  await database().batch([
    database().prepare(`INSERT OR REPLACE INTO document_upload_parts
      (upload_id, part_index, size_bytes, storage_key) VALUES (?, ?, ?, ?)`)
      .bind(uploadId, partIndex, bytes.byteLength, storageKey),
    database().prepare("UPDATE document_uploads SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_email = ?")
      .bind(uploadId, user.email),
  ]);

  return NextResponse.json({ ok: true, partIndex });
}
