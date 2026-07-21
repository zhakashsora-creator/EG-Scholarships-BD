import { NextResponse } from "next/server";
import { getStudentUser } from "../../../lib/auth";
import { database, documentBucket, ensureSchema } from "../../../lib/storage";

export async function GET(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  await ensureSchema();
  const row = await database().prepare(`SELECT filename, mime_type AS mimeType, storage_key AS storageKey FROM documents WHERE id = ? AND owner_email = ?`).bind(id, user.email).first<{ filename: string; mimeType: string; storageKey: string }>();
  if (!row) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const object = await documentBucket().get(row.storageKey);
  if (!object) return NextResponse.json({ error: "Stored file is unavailable" }, { status: 404 });
  const safeName = row.filename.replace(/["\r\n]/g, "");
  return new NextResponse(object.body, { headers: { "Content-Type": row.mimeType, "Content-Disposition": `inline; filename="${safeName}"`, "Cache-Control": "private, no-store" } });
}
