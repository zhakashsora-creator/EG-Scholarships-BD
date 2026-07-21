import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { rankScholarships, type StudentProfile } from "../../lib/matching";
import { database, ensureSchema } from "../../lib/storage";

type LocalExtraction = {
  profile?: StudentProfile;
  evidenceNotes?: string[];
  analyzedIds?: string[];
  warnings?: string[];
};

type AnalyzeBody = {
  profile?: StudentProfile;
  localExtraction?: LocalExtraction | null;
};

const DOCUMENT_FACT_KEYS: Array<keyof StudentProfile> = ["gpa", "englishTest", "englishScore", "workExperience"];

function mergeDocumentFacts(submitted: StudentProfile, extracted?: StudentProfile) {
  const merged: StudentProfile = { ...submitted };
  if (!extracted) return merged;
  for (const key of DOCUMENT_FACT_KEYS) {
    const value = extracted[key];
    if (!merged[key] && typeof value === "string" && value.trim()) Object.assign(merged, { [key]: value.trim() });
  }
  return merged;
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as AnalyzeBody;
  const submitted = body.profile ?? {};
  const extraction = body.localExtraction;
  const profile = mergeDocumentFacts(submitted, extraction?.profile);
  await ensureSchema();

  const analyzedIds = Array.from(new Set((extraction?.analyzedIds ?? []).filter((id): id is string => typeof id === "string"))).slice(0, 4);
  if (analyzedIds.length) {
    const placeholders = analyzedIds.map(() => "?").join(", ");
    await database()
      .prepare(`UPDATE documents SET status = 'analyzed' WHERE owner_email = ? AND id IN (${placeholders})`)
      .bind(user.email, ...analyzedIds)
      .run();
  }

  const evidenceCount = (extraction?.evidenceNotes ?? []).filter((note) => typeof note === "string" && note.trim()).length;
  const warningCount = (extraction?.warnings ?? []).filter((warning) => typeof warning === "string" && warning.trim()).length;
  const notice = analyzedIds.length
    ? `On-device document reading reviewed ${analyzedIds.length} file${analyzedIds.length === 1 ? "" : "s"}${evidenceCount ? ` and detected ${evidenceCount} supported profile fact${evidenceCount === 1 ? "" : "s"}` : ""}. Raw document text was not sent to an AI service.${warningCount ? ` ${warningCount} file${warningCount === 1 ? "" : "s"} need manual review.` : ""}`
    : "Matches use the verified catalogue and the profile fields you entered.";

  const results = rankScholarships(profile, 5);
  const completenessFields = [profile.studyLevel, profile.field, profile.gpa, profile.englishScore, profile.intake];
  const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);
  await database()
    .prepare(`INSERT INTO students (email, full_name, profile_json, completeness, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, profile_json=excluded.profile_json,
      completeness=excluded.completeness, updated_at=CURRENT_TIMESTAMP`)
    .bind(user.email, user.fullName, JSON.stringify(profile), completeness)
    .run();

  await database().prepare(`DELETE FROM matches WHERE owner_email = ?`).bind(user.email).run();
  if (results.length) {
    await database().batch(
      results.map((result, index) =>
        database()
          .prepare(`INSERT INTO matches (id, owner_email, scholarship_id, rank, score, rationale, gaps_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            crypto.randomUUID(), user.email, result.scholarship.id, index + 1,
            result.score, result.rationale, JSON.stringify(result.gaps),
          ),
      ),
    );
  }

  return NextResponse.json({ mode: analyzedIds.length ? "on-device" : "rules", notice, profile, completeness, results, analyzedIds });
}
