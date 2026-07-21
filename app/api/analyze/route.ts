import { Buffer } from "node:buffer";
import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { rankScholarships, type StudentProfile } from "../../lib/matching";
import { database, documentBucket, ensureSchema } from "../../lib/storage";

type AnalyzeBody = {
  profile?: StudentProfile;
  consentToAiDocumentReview?: boolean;
};

const profileSchema = {
  type: "object",
  properties: {
    studyLevel: { type: "string" },
    preferredCountries: { type: "array", items: { type: "string" } },
    field: { type: "string" },
    gpa: { type: "string" },
    englishTest: { type: "string" },
    englishScore: { type: "string" },
    budget: { type: "string" },
    intake: { type: "string" },
    workExperience: { type: "string" },
    notes: { type: "string" },
    evidenceNotes: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
  },
  required: [
    "studyLevel", "preferredCountries", "field", "gpa", "englishTest", "englishScore",
    "budget", "intake", "workExperience", "notes", "evidenceNotes", "missingInformation",
  ],
  additionalProperties: false,
};

async function safetyIdentifier(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function extractProfileFromDocuments(email: string, profile: StudentProfile) {
  const apiKey = (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!apiKey) return null;

  const rows = await database()
    .prepare(`SELECT filename, mime_type AS mimeType, storage_key AS storageKey
      FROM documents WHERE owner_email = ? ORDER BY created_at DESC LIMIT 6`)
    .bind(email)
    .all<{ filename: string; mimeType: string; storageKey: string }>();

  const fileInputs: Array<Record<string, string>> = [];
  for (const row of rows.results ?? []) {
    const object = await documentBucket().get(row.storageKey);
    if (!object) continue;
    const base64 = Buffer.from(await object.arrayBuffer()).toString("base64");
    fileInputs.push({
      type: "input_file",
      filename: row.filename,
      file_data: `data:${row.mimeType};base64,${base64}`,
      ...(row.mimeType === "application/pdf" ? { detail: "high" } : {}),
    });
  }
  if (!fileInputs.length) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-terra",
      store: false,
      safety_identifier: await safetyIdentifier(email),
      reasoning: { effort: "low" },
      input: [
        {
          role: "developer",
          content:
            "Extract only facts supported by the student's documents or supplied form. Do not infer grades, funds, test scores, eligibility, or identity details. Preserve uncertainty in missingInformation. Return concise evidence notes without quoting identifiers such as passport numbers, account numbers, or full addresses.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: `Student-entered profile: ${JSON.stringify(profile)}` },
            ...fileInputs,
          ],
        },
      ],
      text: {
        verbosity: "low",
        format: { type: "json_schema", name: "student_profile", strict: true, schema: profileSchema },
      },
    }),
  });

  if (!response.ok) throw new Error(`AI analysis failed (${response.status})`);
  const payload = (await response.json()) as {
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("AI analysis returned no structured profile");
  return JSON.parse(outputText) as StudentProfile & { evidenceNotes: string[]; missingInformation: string[] };
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as AnalyzeBody;
  const submitted = body.profile ?? {};
  await ensureSchema();

  let extracted: (StudentProfile & { evidenceNotes?: string[]; missingInformation?: string[] }) | null = null;
  let mode: "ai" | "rules" = "rules";
  let notice = "Matches use the verified catalogue and the profile fields you entered.";
  if (body.consentToAiDocumentReview) {
    try {
      extracted = await extractProfileFromDocuments(user.email, submitted);
      if (extracted) {
        mode = "ai";
        notice = "Documents were read with your consent; extracted facts were then matched against the verified catalogue.";
      } else {
        notice = "No AI key or uploaded documents are available yet, so matching used your entered profile only.";
      }
    } catch (error) {
      notice = error instanceof Error ? `${error.message}. Matching used your entered profile instead.` : notice;
    }
  }

  const profile = extracted ?? submitted;
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

  return NextResponse.json({ mode, notice, profile, completeness, results });
}
