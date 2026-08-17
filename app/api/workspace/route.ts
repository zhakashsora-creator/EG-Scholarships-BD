import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { profileCompleteness, scholarships, type StudentProfile } from "../../lib/matching";
import { isGeminiConfigured } from "../../lib/gemini-matching";
import { database, ensureSchema } from "../../lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const [student, account, matchRows, applicationRows, progressRows] = await Promise.all([
    database().prepare(`SELECT profile_json AS profileJson, completeness FROM students WHERE email = ?`).bind(user.email).first<{ profileJson: string; completeness: number }>(),
    database().prepare(`SELECT full_name AS fullName, address, mobile, date_of_birth AS dateOfBirth,
      nationality, current_institution AS currentInstitution, photo_storage_key AS photoStorageKey,
      photo_version AS photoVersion, onboarding_complete AS onboardingComplete
      FROM student_accounts WHERE email = ?`).bind(user.email).first<{
        fullName: string; address: string; mobile: string; dateOfBirth: string | null;
        nationality: string; currentInstitution: string | null; photoStorageKey: string | null;
        photoVersion: number; onboardingComplete: number;
      }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId, rank, score, rationale, gaps_json AS gapsJson FROM matches WHERE owner_email = ? ORDER BY rank`).bind(user.email).all<{ scholarshipId: string; rank: number; score: number; rationale: string; gapsJson: string }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId, stage, next_action AS nextAction, workflow_json AS workflowJson, updated_at AS updatedAt FROM applications WHERE owner_email = ? ORDER BY updated_at DESC`).bind(user.email).all<{ scholarshipId: string; stage: string; nextAction: string; workflowJson: string; updatedAt: string }>(),
    database().prepare(`SELECT stage, note, created_at AS createdAt FROM progress_events WHERE owner_email = ? ORDER BY created_at DESC LIMIT 8`).bind(user.email).all(),
  ]);
  const byId = new Map(scholarships.map((item) => [item.id, item]));
  const matches = (matchRows.results ?? []).flatMap((row) => {
    const scholarship = byId.get(row.scholarshipId);
    if (!scholarship) return [];
    return [{ scholarship, score: row.score, rationale: row.rationale, gaps: JSON.parse(row.gapsJson), label: row.score >= 80 ? "Strong match" : row.score >= 64 ? "Possible match" : "Review required" }];
  });
  let profile: StudentProfile = {};
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  return NextResponse.json({
    account: account ? {
      fullName: account.fullName,
      address: account.address,
      mobile: account.mobile,
      dateOfBirth: account.dateOfBirth ?? "",
      nationality: account.nationality,
      currentInstitution: account.currentInstitution ?? "",
      hasPhoto: Boolean(account.photoStorageKey),
      photoVersion: account.photoVersion,
      onboardingComplete: Boolean(account.onboardingComplete),
    } : null,
    profile,
    completeness: student?.completeness ?? 0,
    matches,
    applications: (applicationRows.results ?? []).map((application) => {
      let workflow = {};
      try { workflow = application.workflowJson ? JSON.parse(application.workflowJson) : {}; } catch { workflow = {}; }
      return { scholarshipId: application.scholarshipId, stage: application.stage, nextAction: application.nextAction, workflow, updatedAt: application.updatedAt };
    }),
    progress: progressRows.results ?? [],
    analysisMode: isGeminiConfigured() ? "hybrid-gemini" : "on-device",
    aiConfigured: isGeminiConfigured(),
  });
}

export async function PUT(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const profile = (await request.json()) as StudentProfile;
  const completeness = profileCompleteness(profile);
  await ensureSchema();
  const account = await database().prepare(`SELECT full_name AS fullName FROM student_accounts WHERE email = ?`)
    .bind(user.email).first<{ fullName: string }>();
  await database().prepare(`INSERT INTO students (email, full_name, profile_json, completeness, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, profile_json=excluded.profile_json,
    completeness=excluded.completeness, updated_at=CURRENT_TIMESTAMP`)
    .bind(user.email, account?.fullName ?? user.fullName, JSON.stringify(profile), completeness).run();
  return NextResponse.json({ profile, completeness });
}
