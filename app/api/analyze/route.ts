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

const MAX_AI_INPUT_BYTES = 48 * 1024 * 1024;
const PROFILE_KEYS: Array<keyof StudentProfile> = [
  "studyLevel", "preferredCountries", "field", "gpa", "englishTest", "englishScore",
  "budget", "intake", "workExperience", "notes",
];

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
    .prepare(`SELECT id, filename, mime_type AS mimeType, size_bytes AS sizeBytes, storage_key AS storageKey
      FROM documents WHERE owner_email = ? ORDER BY created_at DESC LIMIT 6`)
    .bind(email)
    .all<{ id: string; filename: string; mimeType: string; sizeBytes: number; storageKey: string }>();

  const fileInputs: Array<Record<string, string>> = [];
  const analyzedIds: string[] = [];
  let totalBytes = 0;
  for (const row of rows.results ?? []) {
    if (row.sizeBytes > MAX_AI_INPUT_BYTES || totalBytes + row.sizeBytes > MAX_AI_INPUT_BYTES) continue;
    const object = await documentBucket().get(row.storageKey);
    if (!object) continue;
    const base64 = Buffer.from(await object.arrayBuffer()).toString("base64");
    if (row.mimeType.startsWith("image/")) {
      fileInputs.push({ type: "input_image", image_url: `data:${row.mimeType};base64,${base64}`, detail: "high" });
    } else {
      fileInputs.push({
        type: "input_file",
        filename: row.filename,
        file_data: `data:${row.mimeType};base64,${base64}`,
        ...(row.mimeType === "application/pdf" ? { detail: "high" } : {}),
      });
    }
    totalBytes += row.sizeBytes;
    analyzedIds.push(row.id);
  }
  if (!fileInputs.length) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: (env as unknown as { OPENAI_MODEL?: string }).OPENAI_MODEL || "gpt-5.6-terra",
      store: false,
      safety_identifier: await safetyIdentifier(email),
      reasoning: { effort: "low" },
      input: [
        {
          role: "developer",
          content:
            "Read the supplied academic, language, financial, identity and supporting files carefully, including scanned page images. Extract only facts supported by the student's documents or supplied form. Keep student-entered preferences unless a document provides a more precise factual value. Do not infer grades, funds, test scores, eligibility, or identity details. Preserve uncertainty in missingInformation. Return concise evidence notes without quoting passport numbers, account numbers, full addresses or other unnecessary identifiers.",
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
  return {
    extracted: JSON.parse(outputText) as StudentProfile & { evidenceNotes: string[]; missingInformation: string[] },
    analyzedIds,
  };
}

function mergeSupportedProfile(submitted: StudentProfile, extracted: StudentProfile) {
  const merged: StudentProfile = { ...submitted };
  for (const key of PROFILE_KEYS) {
    const value = extracted[key];
    if (Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? "").trim())) {
      Object.assign(merged, { [key]: value });
    }
  }
  return merged;
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as AnalyzeBody;
  const submitted = body.profile ?? {};
  await ensureSchema();

  let extracted: Awaited<ReturnType<typeof extractProfileFromDocuments>> = null;
  let mode: "ai" | "rules" = "rules";
  let notice = "Matches use the verified catalogue and the profile fields you entered.";
  if (body.consentToAiDocumentReview) {
    try {
      extracted = await extractProfileFromDocuments(user.email, submitted);
      if (extracted) {
        mode = "ai";
        notice = "Documents were read with your consent; extracted facts were then matched against the verified catalogue.";
        const placeholders = extracted.analyzedIds.map(() => "?").join(", ");
        await database()
          .prepare(`UPDATE documents SET status = 'analyzed' WHERE owner_email = ? AND id IN (${placeholders})`)
          .bind(user.email, ...extracted.analyzedIds)
          .run();
      } else {
        notice = "No AI key or uploaded documents are available yet, so matching used your entered profile only.";
      }
    } catch (error) {
      notice = error instanceof Error ? `${error.message}. Matching used your entered profile instead.` : notice;
    }
  }

  const profile = extracted ? mergeSupportedProfile(submitted, extracted.extracted) : submitted;
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
