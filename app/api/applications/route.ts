import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, ensureSchema } from "../../lib/storage";

const stages = new Set(["shortlisted", "preparing", "submitted", "decision"]);

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as { scholarshipId?: string; stage?: string; nextAction?: string };
  if (!body.scholarshipId || !body.stage || !stages.has(body.stage)) return NextResponse.json({ error: "Invalid application update" }, { status: 400 });
  const nextAction = (body.nextAction ?? "Review with consultant").trim().slice(0, 240);
  await ensureSchema();
  const id = crypto.randomUUID();
  await database().prepare(`INSERT INTO applications (id, owner_email, scholarship_id, stage, next_action, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(owner_email, scholarship_id) DO UPDATE SET stage=excluded.stage, next_action=excluded.next_action, updated_at=CURRENT_TIMESTAMP`)
    .bind(id, user.email, body.scholarshipId, body.stage, nextAction).run();
  return NextResponse.json({ application: { scholarshipId: body.scholarshipId, stage: body.stage, nextAction } });
}
