import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getStudentUser } from "../../lib/auth";
import { scholarships, type StudentProfile } from "../../lib/matching";
import { database, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const [student, matchRows, applicationRows, progressRows] = await Promise.all([
    database().prepare(`SELECT profile_json AS profileJson, completeness FROM students WHERE email = ?`).bind(user.email).first<{ profileJson: string; completeness: number }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId, rank, score, rationale, gaps_json AS gapsJson FROM matches WHERE owner_email = ? ORDER BY rank`).bind(user.email).all<{ scholarshipId: string; rank: number; score: number; rationale: string; gapsJson: string }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId, stage, next_action AS nextAction, updated_at AS updatedAt FROM applications WHERE owner_email = ? ORDER BY updated_at DESC`).bind(user.email).all(),
    database().prepare(`SELECT stage, note, created_at AS createdAt FROM progress_events WHERE owner_email = ? ORDER BY created_at DESC LIMIT 8`).bind(user.email).all(),
  ]);
  const byId = new Map(scholarships.map((item) => [item.id, item]));
  const matches = (matchRows.results ?? []).flatMap((row) => {
    const scholarship = byId.get(row.scholarshipId);
    if (!scholarship) return [];
    return [{ scholarship, score: row.score, rationale: row.rationale, gaps: JSON.parse(row.gapsJson), label: row.score >= 78 ? "Strong match" : row.score >= 62 ? "Possible match" : "Review required" }];
  });
  let profile: StudentProfile = {};
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  const aiConfigured = Boolean((env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY);
  return NextResponse.json({ profile, completeness: student?.completeness ?? 0, matches, applications: applicationRows.results ?? [], progress: progressRows.results ?? [], aiConfigured });
}

export async function PUT(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const profile = (await request.json()) as StudentProfile;
  const fields = [profile.studyLevel, profile.field, profile.gpa, profile.englishScore, profile.intake, profile.preferredCountries?.length];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  await ensureSchema();
  await database().prepare(`INSERT INTO students (email, full_name, profile_json, completeness, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, profile_json=excluded.profile_json,
    completeness=excluded.completeness, updated_at=CURRENT_TIMESTAMP`)
    .bind(user.email, user.fullName, JSON.stringify(profile), completeness).run();
  return NextResponse.json({ profile, completeness });
}
