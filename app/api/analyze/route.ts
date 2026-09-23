import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { buildAvailableMatches, buildCountryCoverageNotices, buildPriorityMatches, profileCompleteness, type StudentProfile } from "../../lib/matching";
import { enhanceMatchesWithGemini } from "../../lib/gemini-matching";
import { database, ensureSchema } from "../../lib/storage";
import { buildScholarshipReportPdf, consultationUrl, emailScholarshipReport, isReportEmailConfigured, type ReportSnapshot } from "../../lib/scholarship-report";

type LocalExtraction = {
  profile?: StudentProfile;
  evidenceNotes?: string[];
  analyzedIds?: string[];
  warnings?: string[];
};

type AnalyzeBody = {
  profile?: StudentProfile;
  localExtraction?: LocalExtraction | null;
  emailReport?: boolean;
  followUpConsent?: boolean;
};

const DOCUMENT_FACT_KEYS: Array<keyof StudentProfile> = ["gpa", "bachelorCgpa", "englishTest", "englishScore", "workExperience"];

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
  const documentNotice = analyzedIds.length
    ? `On-device document reading reviewed ${analyzedIds.length} file${analyzedIds.length === 1 ? "" : "s"}${evidenceCount ? ` and detected ${evidenceCount} supported profile fact${evidenceCount === 1 ? "" : "s"}` : ""}. Raw document text was not sent to an AI service.${warningCount ? ` ${warningCount} file${warningCount === 1 ? "" : "s"} need manual review.` : ""}`
    : "Matches use the verified catalogue and the profile fields you entered.";

  const ruleResults = buildAvailableMatches(profile);
  const enhanced = await enhanceMatchesWithGemini(profile, ruleResults);
  const results = enhanced.matches;
  const priorityMatches = buildPriorityMatches(profile, results, 10);
  const countryNotices = buildCountryCoverageNotices(profile, results);
  const completeness = profileCompleteness(profile);
  const aiNotice = enhanced.used
    ? ` AI-assisted explanations were verified against the catalogue; deterministic eligibility, subscores and score bands remained authoritative.${enhanced.summary ? ` ${enhanced.summary}` : ""}`
    : " Results use catalogue-verified eligibility scoring; optional AI-assisted explanations are currently unavailable.";
  const notice = `${documentNotice}${aiNotice} All currently available destination matches are shown, plus a separate fully funded build-up shortlist; lower-confidence choices are marked for review.`;
  await database()
    .prepare(`INSERT INTO students (email, full_name, profile_json, completeness, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, profile_json=excluded.profile_json,
      completeness=excluded.completeness, updated_at=CURRENT_TIMESTAMP`)
    .bind(user.email, user.fullName, JSON.stringify(profile), completeness)
    .run();

  await database().prepare(`DELETE FROM matches WHERE owner_email = ?`).bind(user.email).run();
  if (results.length) {
    const statements = results.map((result, index) =>
        database()
          .prepare(`INSERT INTO matches (id, owner_email, scholarship_id, rank, score, rationale, gaps_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            crypto.randomUUID(), user.email, result.scholarship.id, index + 1,
            result.score, result.rationale, JSON.stringify(result.gaps),
          ),
      );
    for (let offset = 0; offset < statements.length; offset += 50) {
      await database().batch(statements.slice(offset, offset + 50));
    }
  }

  const account = await database().prepare(`SELECT full_name AS fullName FROM student_accounts WHERE email = ?`)
    .bind(user.email).first<{ fullName: string }>();
  const reportId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const snapshot: ReportSnapshot = {
    id: reportId,
    createdAt,
    student: { fullName: account?.fullName ?? user.fullName, email: user.email },
    profile,
    matches: priorityMatches,
    followUpConsent: body.followUpConsent === true,
  };
  let reportStatus: "ready" | "sent" | "failed" = "ready";
  let reportSentAt: string | null = null;
  let providerId = "";
  let deliveryError = "";
  if (body.emailReport !== false && isReportEmailConfigured()) {
    try {
      const bookingUrl = consultationUrl(new URL(request.url).origin);
      const pdf = await buildScholarshipReportPdf(snapshot, bookingUrl);
      const delivery = await emailScholarshipReport(snapshot, pdf, bookingUrl);
      reportStatus = delivery.status;
      providerId = delivery.providerId;
      deliveryError = delivery.error;
      if (delivery.status === "sent") reportSentAt = new Date().toISOString();
    } catch (error) {
      console.error("Scholarship report delivery failed", error);
      reportStatus = "failed";
      deliveryError = "Report email could not be delivered";
    }
  }
  await database().prepare(`INSERT INTO scholarship_reports
    (id, owner_email, recipient_email, status, snapshot_json, provider_id, error_message, follow_up_consent, created_at, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(reportId, user.email, user.email, reportStatus, JSON.stringify(snapshot), providerId || null,
      deliveryError || null, body.followUpConsent === true ? 1 : 0, createdAt, reportSentAt).run();
  await database().prepare(`INSERT INTO progress_events (id, owner_email, stage, note) VALUES (?, ?, 'Scholarship report prepared', ?)`)
    .bind(crypto.randomUUID(), user.email, reportStatus === "sent" ? "Fully funded priority report emailed to the student" : "Fully funded priority report ready to download").run();

  const report = {
    id: reportId,
    status: reportStatus,
    recipientEmail: user.email,
    createdAt,
    sentAt: reportSentAt,
    downloadUrl: `/api/report?id=${encodeURIComponent(reportId)}`,
    emailConfigured: isReportEmailConfigured(),
    message: reportStatus === "sent"
      ? `Your detailed report was emailed to ${user.email}.`
      : reportStatus === "failed"
        ? "Your report is ready to download, but email delivery needs attention."
        : "Your report is ready to download.",
  };

  return NextResponse.json({ mode: enhanced.used ? "ai-assisted" : analyzedIds.length ? "on-device" : "rules", notice, profile, completeness, results, priorityMatches, countryNotices, analyzedIds, aiEnhanced: enhanced.used, report });
}
