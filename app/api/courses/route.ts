import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, ensureSchema } from "../../lib/storage";
import { scholarships, type StudentProfile } from "../../lib/matching";
import { extractGeminiJson, geminiGenerateContent, geminiText, isGeminiConfigured } from "../../lib/gemini-client";
import { isPlausibleOfficialEducationUrl, safePublicHttpsUrl } from "../../lib/safe-url";

export const dynamic = "force-dynamic";

type CourseResult = {
  summary?: string;
  courses?: Array<{ name?: string; level?: string; university?: string; url?: string; why?: string }>;
};

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!isGeminiConfigured()) return NextResponse.json({ error: "AI course discovery is temporarily unavailable" }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { scholarshipId?: string };
  const scholarship = scholarships.find((item) => item.id === body.scholarshipId);
  if (!scholarship) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  await ensureSchema();
  const student = await database().prepare(`SELECT profile_json AS profileJson FROM students WHERE email = ?`).bind(user.email).first<{ profileJson: string }>();
  let profile: StudentProfile = {};
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  const searchProfile = {
    targetLevel: String(profile.studyLevel ?? scholarship.studyLevel).slice(0, 100),
    subject: String(profile.field ?? profile.bachelorSubject ?? "").slice(0, 180),
    destination: scholarship.country,
  };
  const prompt = `Find up to 8 currently published subjects, degrees or courses that fit this student's target profile and are relevant to the named scholarship or discount. Use Google Search grounding. Return only direct HTTPS links on official university, government or recognized programme websites; never return aggregators, agents, social media, search-result pages or invented URLs. If the award spans multiple universities, include a balanced set of official course pages from participating institutions only when participation is supported by an official source. If exact course eligibility is uncertain, say so in "why".

Return JSON only:
{"summary":"short scope note","courses":[{"name":"official programme title","level":"study level","university":"institution","url":"direct official course URL","why":"one profile-specific reason and any uncertainty"}]}

PROFILE: ${JSON.stringify(searchProfile)}
SCHOLARSHIP: ${JSON.stringify({ name: scholarship.name, provider: scholarship.provider, country: scholarship.country, level: scholarship.studyLevel, subjectRestrictions: scholarship.subjectRestrictions, officialSource: scholarship.officialSource })}`;

  try {
    const payload = await geminiGenerateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 3500 },
    }, 25_000);
    const parsed = extractGeminiJson<CourseResult>(geminiText(payload));
    const courses = (Array.isArray(parsed.courses) ? parsed.courses : []).flatMap((item) => {
      const url = String(item.url ?? "").trim();
      if (!safePublicHttpsUrl(url) || !isPlausibleOfficialEducationUrl(url, scholarship.officialSource, scholarship.provider)) return [];
      return [{
        name: String(item.name ?? "Official programme").slice(0, 220),
        level: String(item.level ?? scholarship.studyLevel).slice(0, 100),
        university: String(item.university ?? scholarship.provider).slice(0, 180),
        url,
        why: String(item.why ?? "Relevant to the saved study profile; confirm entry requirements on the official page.").slice(0, 450),
      }];
    }).slice(0, 8);
    return NextResponse.json({
      scholarshipId: scholarship.id,
      summary: String(parsed.summary ?? "Official course discovery completed.").slice(0, 500),
      courses,
      officialSource: scholarship.officialSource,
      disclaimer: "AI-assisted discovery is limited to official-looking sources. Always confirm course availability, scholarship coverage and entry requirements on the linked official page.",
    });
  } catch (error) {
    console.error("Course discovery unavailable", error);
    return NextResponse.json({ error: "Official course discovery could not be completed right now. Use the scholarship's official source while the service recovers." }, { status: 503 });
  }
}
