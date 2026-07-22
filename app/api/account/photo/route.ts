import { NextResponse } from "next/server";
import { getStudentUser } from "../../../lib/auth";
import { database, documentBucket, ensureSchema } from "../../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const row = await database().prepare(`SELECT photo_storage_key AS storageKey,
    photo_mime_type AS mimeType FROM student_accounts WHERE email = ?`)
    .bind(user.email).first<{ storageKey: string | null; mimeType: string | null }>();
  if (!row?.storageKey) return NextResponse.json({ error: "Profile photo not found" }, { status: 404 });
  const object = await documentBucket().get(row.storageKey);
  if (!object) return NextResponse.json({ error: "Profile photo not found" }, { status: 404 });
  return new NextResponse(object.body, {
    headers: {
      "Content-Type": row.mimeType ?? "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
