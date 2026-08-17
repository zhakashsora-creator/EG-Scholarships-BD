import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, ensureSchema } from "../../lib/storage";

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as { message?: string };
  const message = (body.message ?? "Please review my Best Finds scholarship shortlist.").trim().slice(0, 1200);
  await ensureSchema();
  const id = crypto.randomUUID();
  await database()
    .batch([
      database()
        .prepare(`INSERT INTO consultant_requests (id, owner_email, message, status) VALUES (?, ?, ?, 'requested')`)
        .bind(id, user.email, message),
      database()
        .prepare(`INSERT INTO progress_events (id, owner_email, stage, note) VALUES (?, ?, 'Consultant review requested', ?)`)
        .bind(crypto.randomUUID(), user.email, message),
    ]);
  return NextResponse.json({ id, status: "requested" });
}
