import { env } from "cloudflare:workers";
import type { StudentProfile } from "./matching";

type ConsultationRuntime = {
  GMAIL_REPORT_WEBHOOK_URL?: string;
  GMAIL_REPORT_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  REPORT_FROM_EMAIL?: string;
  CONSULTATION_ALERT_EMAIL?: string;
};

export type ConsultationNotification = {
  id: string;
  student: {
    fullName: string;
    email: string;
    mobile: string;
    address: string;
    currentInstitution: string;
  };
  profile: StudentProfile;
  topMatches: Array<{ name: string; country: string; score: number }>;
  message: string;
};

function localValue(key: keyof ConsultationRuntime) {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

function runtime() {
  const worker = env as unknown as ConsultationRuntime;
  const value = (key: keyof ConsultationRuntime) => worker[key] ?? localValue(key);
  return {
    gmailUrl: value("GMAIL_REPORT_WEBHOOK_URL")?.trim(),
    gmailSecret: value("GMAIL_REPORT_WEBHOOK_SECRET")?.trim(),
    resendKey: value("RESEND_API_KEY")?.trim(),
    from: value("REPORT_FROM_EMAIL")?.trim(),
    recipient: value("CONSULTATION_ALERT_EMAIL")?.trim() || "hello.excellenceglobal@gmail.com",
  };
}

function clean(value?: string, fallback = "Not provided") {
  return value?.replace(/\s+/g, " ").trim() || fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

export async function emailConsultationRequest(input: ConsultationNotification) {
  const config = runtime();
  const profile = input.profile;
  const matches = input.topMatches.length
    ? input.topMatches.map((match, index) => `<li style="margin:0 0 8px"><strong>#${index + 1} ${escapeHtml(match.name)}</strong> — ${escapeHtml(match.country)}, ${match.score}% match</li>`).join("")
    : "<li>No scholarship shortlist has been generated yet.</li>";
  const subject = `New scholarship consultation request — ${input.student.fullName}`;
  const text = [
    "A student requested a free at-office scholarship consultation.",
    `Name: ${input.student.fullName}`,
    `Email: ${input.student.email}`,
    `Mobile: ${clean(input.student.mobile)}`,
    `Institution: ${clean(input.student.currentInstitution)}`,
    `Target: ${clean(profile.studyLevel)} in ${clean(profile.field)}`,
    `Destinations: ${profile.preferredCountries?.join(", ") || "Not provided"}`,
    `Intake: ${clean(profile.intake)}`,
    `Budget: ${clean(profile.budget)}`,
    `Message: ${input.message}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f8;font-family:Arial,sans-serif;color:#0d1f35"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" style="max-width:650px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#0d1f35;padding:22px 28px;color:#fff"><strong style="font-size:18px">EG Consultancy</strong><div style="color:#eab34d;font-size:11px;margin-top:5px">NEW CONSULTATION REQUEST</div></td></tr><tr><td style="padding:30px 28px"><h1 style="font-size:24px;margin:0 0 10px">${escapeHtml(input.student.fullName)} requested a consultation.</h1><p style="color:#51606f;line-height:1.6">The request has been saved in the scholarship portal. Reply directly to this email or contact the student using the details below.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="7" style="font-size:14px;border-collapse:collapse"><tr><td><strong>Email</strong></td><td>${escapeHtml(input.student.email)}</td></tr><tr><td><strong>Mobile</strong></td><td>${escapeHtml(clean(input.student.mobile))}</td></tr><tr><td><strong>Address</strong></td><td>${escapeHtml(clean(input.student.address))}</td></tr><tr><td><strong>Institution</strong></td><td>${escapeHtml(clean(input.student.currentInstitution))}</td></tr><tr><td><strong>Study target</strong></td><td>${escapeHtml(`${clean(profile.studyLevel)} in ${clean(profile.field)}`)}</td></tr><tr><td><strong>Destinations</strong></td><td>${escapeHtml(profile.preferredCountries?.join(", ") || "Not provided")}</td></tr><tr><td><strong>Intake / budget</strong></td><td>${escapeHtml(`${clean(profile.intake)} / ${clean(profile.budget)}`)}</td></tr></table><h2 style="font-size:17px;margin:25px 0 10px">Current leading matches</h2><ol style="padding-left:22px;line-height:1.5">${matches}</ol><h2 style="font-size:17px;margin:25px 0 10px">Student request</h2><p style="background:#eef8f6;border-left:4px solid #00917d;padding:14px;line-height:1.6">${escapeHtml(input.message)}</p><a href="https://wa.me/${input.student.mobile.replace(/\D/g, "")}" style="display:inline-block;margin-top:12px;background:#00917d;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:7px">Contact student on WhatsApp</a></td></tr></table></td></tr></table></body></html>`;

  if (config.gmailUrl && config.gmailSecret) {
    const response = await fetch(config.gmailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: config.gmailSecret,
        type: "consultation_request",
        reportId: `consultation-${input.id}`,
        to: config.recipient,
        replyTo: input.student.email,
        subject,
        html,
        text,
      }),
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) return { status: "failed" as const, error: String(result.error ?? `Gmail relay returned ${response.status}`).slice(0, 500) };
    return { status: "sent" as const, error: "" };
  }

  if (config.resendKey && config.from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `consultation/${input.id}` },
      body: JSON.stringify({ from: config.from, to: [config.recipient], reply_to: input.student.email, subject, html }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string };
    if (!response.ok) return { status: "failed" as const, error: String(result.message ?? `Email provider returned ${response.status}`).slice(0, 500) };
    return { status: "sent" as const, error: "" };
  }

  return { status: "unconfigured" as const, error: "Consultation email delivery is not configured" };
}
