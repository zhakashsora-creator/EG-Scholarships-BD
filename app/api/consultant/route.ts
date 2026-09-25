import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { emailConsultationRequest } from "../../lib/consultation-notification";
import { type StudentProfile } from "../../lib/matching";
import { getScholarshipCatalogue } from "../../lib/scholarship-catalogue";
import { database, ensureSchema } from "../../lib/storage";

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as { message?: string };
  const message = (body.message ?? "Please review my Best Finds scholarship shortlist.").trim().slice(0, 1200);
  await ensureSchema();
  const catalogue = await getScholarshipCatalogue();
  const id = crypto.randomUUID();
  const [account, student, matchRows] = await Promise.all([
    database().prepare(`SELECT full_name AS fullName, mobile, address, current_institution AS currentInstitution
      FROM student_accounts WHERE email = ?`).bind(user.email).first<{
        fullName: string; mobile: string; address: string; currentInstitution: string | null;
      }>(),
    database().prepare(`SELECT profile_json AS profileJson FROM students WHERE email = ?`)
      .bind(user.email).first<{ profileJson: string }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId, score FROM matches
      WHERE owner_email = ? ORDER BY rank LIMIT 3`).bind(user.email).all<{ scholarshipId: string; score: number }>(),
  ]);
  await database()
    .batch([
      database()
        .prepare(`INSERT INTO consultant_requests (id, owner_email, message, status) VALUES (?, ?, ?, 'requested')`)
        .bind(id, user.email, message),
      database()
        .prepare(`INSERT INTO progress_events (id, owner_email, stage, note) VALUES (?, ?, 'Consultant review requested', ?)`)
        .bind(crypto.randomUUID(), user.email, message),
    ]);
  let profile: StudentProfile = {};
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  const byId = new Map(catalogue.map((scholarship) => [scholarship.id, scholarship]));
  const topMatches = (matchRows.results ?? []).flatMap((row) => {
    const scholarship = byId.get(row.scholarshipId);
    return scholarship ? [{ name: scholarship.name, country: scholarship.country, score: row.score }] : [];
  });
  const delivery = await emailConsultationRequest({
    id,
    student: {
      fullName: account?.fullName ?? user.fullName,
      email: user.email,
      mobile: account?.mobile ?? "",
      address: account?.address ?? "",
      currentInstitution: account?.currentInstitution ?? "",
    },
    profile,
    topMatches,
    message,
  }).catch((error) => ({ status: "failed" as const, error: error instanceof Error ? error.message : "Notification failed" }));
  const status = delivery.status === "sent" ? "notified" : delivery.status === "failed" ? "notification_failed" : "requested";
  await database().prepare(`UPDATE consultant_requests SET status = ? WHERE id = ? AND owner_email = ?`)
    .bind(status, id, user.email).run();
  return NextResponse.json({
    id,
    status,
    notified: delivery.status === "sent",
    message: delivery.status === "sent"
      ? "Your consultation request has been recorded and emailed to EG Consultancy."
      : "Your consultation request has been recorded. For urgent follow-up, please use the WhatsApp link.",
  });
}
