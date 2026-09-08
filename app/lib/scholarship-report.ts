import { env } from "cloudflare:workers";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ScholarshipMatch, StudentProfile } from "./matching";

export type ReportSnapshot = {
  id: string;
  createdAt: string;
  student: { fullName: string; email: string };
  profile: StudentProfile;
  matches: ScholarshipMatch[];
  followUpConsent: boolean;
};

type ReportRuntime = {
  GMAIL_REPORT_WEBHOOK_URL?: string;
  GMAIL_REPORT_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  REPORT_FROM_EMAIL?: string;
  REPORT_ADMIN_EMAIL?: string;
  CONSULTATION_BOOKING_URL?: string;
  CONSULTANT_REPLY_TO?: string;
};

function localValue(key: keyof ReportRuntime) {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

function reportRuntime() {
  const runtime = env as unknown as ReportRuntime;
  const value = (key: keyof ReportRuntime) => runtime[key] ?? localValue(key);
  return {
    gmailWebhookUrl: value("GMAIL_REPORT_WEBHOOK_URL")?.trim(),
    gmailWebhookSecret: value("GMAIL_REPORT_WEBHOOK_SECRET")?.trim(),
    apiKey: value("RESEND_API_KEY")?.trim(),
    from: value("REPORT_FROM_EMAIL")?.trim(),
    adminEmail: value("REPORT_ADMIN_EMAIL")?.trim(),
    bookingUrl: value("CONSULTATION_BOOKING_URL")?.trim(),
    replyTo: value("CONSULTANT_REPLY_TO")?.trim(),
  };
}

export function isReportEmailConfigured() {
  const config = reportRuntime();
  return Boolean((config.gmailWebhookUrl && config.gmailWebhookSecret) || (config.apiKey && config.from));
}

export function consultationUrl(fallbackOrigin: string) {
  return reportRuntime().bookingUrl || `${fallbackOrigin.replace(/\/$/, "")}/dashboard?tab=consultant`;
}

function clean(value?: string, fallback = "Not provided") {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function ascii(value: string) {
  return value
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/·/g, "|")
    .replace(/[^\x20-\x7E]/g, "");
}

function profileRows(profile: StudentProfile) {
  const academic = profile.hasBachelorDegree === "yes"
    ? `${clean(profile.bachelorDegree)} in ${clean(profile.bachelorSubject || profile.field)} | CGPA ${clean(profile.bachelorCgpa)} / ${clean(profile.bachelorCgpaScale, "4")}`
    : `${clean(profile.higherSecondaryQualification, "Higher secondary")} | ${clean(profile.higherSecondaryResult)}`;
  return [
    ["Academic position", academic],
    ["Target", `${clean(profile.studyLevel)} in ${clean(profile.field)} | ${clean(profile.intake, "Intake not set")}`],
    ["Destinations", profile.preferredCountries?.length ? profile.preferredCountries.join(", ") : "Open to suitable destinations"],
    ["English", `${clean(profile.englishTest, "Test plan not set")}${profile.englishScore ? ` | ${profile.englishScore}` : ""}`],
    ["Funding", `${clean(profile.fundingNeed, "Funding preference not set")} | Budget: ${clean(profile.budget, "Not set")}`],
    ["Experience", clean([profile.workExperience, profile.researchExperience].filter(Boolean).join(" | "), "No experience details supplied")],
  ] as Array<[string, string]>;
}

function actionPlan(snapshot: ReportSnapshot) {
  const actions: string[] = [];
  const profile = snapshot.profile;
  if (!profile.englishScore || /not taken|planning/i.test(profile.englishTest ?? "")) {
    actions.push("Set an English-test date and confirm the minimum overall and band scores for each shortlisted programme.");
  }
  const firstGap = snapshot.matches.flatMap((match) => match.gaps).find(Boolean);
  if (firstGap) actions.push(`Resolve the most common eligibility uncertainty first: ${firstGap}.`);
  actions.push("Open every official source and recheck the live deadline, eligible course, award coverage and application route before preparing an application.");
  actions.push("Prepare a core document pack: transcripts, certificates, passport, CV, statement draft and two referee options.");
  actions.push("Book an EG Consultancy review to turn the strongest two or three options into a deadline-led application plan.");
  return actions.slice(0, 5);
}

type PdfWriter = {
  page: PDFPage;
  y: number;
  pageNumber: number;
  regular: PDFFont;
  bold: PDFFont;
  pages: PDFPage[];
  document: PDFDocument;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const INK = rgb(0.05, 0.12, 0.21);
const MUTED = rgb(0.31, 0.38, 0.45);
const TEAL = rgb(0, 0.57, 0.49);
const GOLD = rgb(0.92, 0.68, 0.2);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function header(writer: PdfWriter) {
  writer.page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 58, width: PAGE_WIDTH, height: 58, color: INK });
  writer.page.drawText("EG CONSULTANCY", { x: MARGIN, y: PAGE_HEIGHT - 35, size: 13, font: writer.bold, color: rgb(1, 1, 1) });
  writer.page.drawText("PERSONAL SCHOLARSHIP REPORT", { x: PAGE_WIDTH - 235, y: PAGE_HEIGHT - 34, size: 8, font: writer.bold, color: GOLD });
  writer.y = PAGE_HEIGHT - 88;
}

function newPage(writer: PdfWriter) {
  const page = writer.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  writer.page = page;
  writer.pages.push(page);
  writer.pageNumber += 1;
  header(writer);
}

function ensureSpace(writer: PdfWriter, height: number) {
  if (writer.y - height < 66) newPage(writer);
}

function textLine(writer: PdfWriter, text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) {
  const size = options.size ?? 10;
  const font = options.bold ? writer.bold : writer.regular;
  const indent = options.indent ?? 0;
  const lines = wrap(text, font, size, PAGE_WIDTH - (MARGIN * 2) - indent);
  const lineHeight = size * 1.38;
  ensureSpace(writer, lines.length * lineHeight + (options.gap ?? 5));
  for (const line of lines) {
    writer.page.drawText(line, { x: MARGIN + indent, y: writer.y, size, font, color: options.color ?? INK });
    writer.y -= lineHeight;
  }
  writer.y -= options.gap ?? 5;
}

function sectionTitle(writer: PdfWriter, title: string) {
  ensureSpace(writer, 38);
  writer.page.drawRectangle({ x: MARGIN, y: writer.y - 5, width: 4, height: 20, color: TEAL });
  textLine(writer, title.toUpperCase(), { size: 14, bold: true, gap: 11, indent: 12 });
}

export async function buildScholarshipReportPdf(snapshot: ReportSnapshot, bookingUrl: string) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.setTitle(`EG Consultancy Scholarship Report - ${snapshot.student.fullName}`);
  document.setAuthor("Excellence Global Consultancy");
  document.setSubject("Personal scholarship match report");
  document.setCreationDate(new Date(snapshot.createdAt));
  const first = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const writer: PdfWriter = { document, page: first, pages: [first], pageNumber: 1, y: 0, regular, bold };
  header(writer);

  textLine(writer, "Your 10 best scholarship matches", { size: 25, bold: true, gap: 6 });
  textLine(writer, `Prepared for ${snapshot.student.fullName}`, { size: 12, bold: true, color: TEAL, gap: 3 });
  textLine(writer, `Generated ${new Date(snapshot.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} | Report ${snapshot.id.slice(0, 8).toUpperCase()}`, { size: 8, color: MUTED, gap: 18 });
  textLine(writer, "This report turns your saved study profile into a practical shortlist. Scores are decision support, not guarantees. Official scholarship and university pages remain authoritative.", { size: 10, color: MUTED, gap: 18 });

  sectionTitle(writer, "Profile summary");
  for (const [label, value] of profileRows(snapshot.profile)) {
    textLine(writer, label, { size: 8, bold: true, color: TEAL, gap: 2 });
    textLine(writer, value, { size: 10, gap: 8 });
  }

  sectionTitle(writer, "Priority action plan");
  actionPlan(snapshot).forEach((action, index) => textLine(writer, `${index + 1}. ${action}`, { size: 10, gap: 7 }));

  sectionTitle(writer, "Your shortlist");
  textLine(writer, `${snapshot.matches.length} ranked options are included. Strong matches should be verified first; possible and review-required options need the stated gaps resolved before you invest in an application.`, { size: 10, color: MUTED, gap: 8 });

  snapshot.matches.forEach((match, index) => {
    newPage(writer);
    writer.page.drawRectangle({ x: MARGIN, y: writer.y - 2, width: PAGE_WIDTH - (MARGIN * 2), height: 22, color: index < 3 ? TEAL : INK });
    writer.page.drawText(`#${index + 1}  ${ascii(match.label).toUpperCase()}  |  ${match.score}% MATCH`, { x: MARGIN + 10, y: writer.y + 5, size: 8, font: bold, color: rgb(1, 1, 1) });
    writer.y -= 34;
    textLine(writer, match.scholarship.name, { size: 16, bold: true, gap: 3 });
    textLine(writer, `${match.scholarship.provider} | ${match.scholarship.country} | ${match.scholarship.studyLevel}`, { size: 9, bold: true, color: TEAL, gap: 8 });
    textLine(writer, `Why it surfaced: ${match.rationale}`, { size: 9, gap: 7 });
    textLine(writer, `Funding: ${clean(match.scholarship.fundingSummary || match.scholarship.coverage, "Confirm on official source")}`, { size: 9, gap: 5 });
    textLine(writer, `Deadline / cycle: ${clean(match.scholarship.deadline, "Annual or programme-specific")} | ${clean(match.scholarship.status, "Live status must be checked")}`, { size: 9, gap: 5 });
    textLine(writer, `Reality check: ${match.gaps.length ? match.gaps.join("; ") : "No major profile gap was detected from the stored criteria; live requirements still need verification."}`, { size: 9, bold: true, color: match.gaps.length ? rgb(0.56, 0.33, 0.08) : TEAL, gap: 6 });
    textLine(writer, `Official source: ${match.scholarship.officialSource}`, { size: 7.5, color: MUTED, gap: 17 });
  });

  newPage(writer);
  sectionTitle(writer, "Turn the shortlist into an application plan");
  textLine(writer, "Bring this report to a free at-office consultation. An EG consultant can verify the live rules, identify the most realistic two or three applications, and map documents and deadlines.", { size: 11, gap: 10 });
  textLine(writer, `Book or request your consultation: ${bookingUrl}`, { size: 10, bold: true, color: TEAL, gap: 8 });
  textLine(writer, "Home Consultation: BDT 1,000 (planned service). The fee will be adjusted against a subscribed package when that service becomes available.", { size: 9, color: MUTED, gap: 14 });
  textLine(writer, "Important: scholarship availability, eligibility, funding, deadlines, course admission and visa outcomes can change. Verify every decision on the linked official source. EG Consultancy does not guarantee admission, funding or a visa.", { size: 8, color: MUTED });

  writer.pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.6, color: rgb(0.82, 0.85, 0.88) });
    page.drawText("Excellence Global Consultancy | Confidential student report", { x: MARGIN, y: 27, size: 7, font: regular, color: MUTED });
    page.drawText(`${index + 1} / ${writer.pages.length}`, { x: PAGE_WIDTH - MARGIN - 28, y: 27, size: 7, font: bold, color: MUTED });
  });

  return document.save();
}

function base64(bytes: Uint8Array) {
  let binary = "";
  const size = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += size) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + size));
  }
  return btoa(binary);
}

export function reportFilename(snapshot: ReportSnapshot) {
  const name = snapshot.student.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "student";
  return `egc-scholarship-report-${name}.pdf`;
}

export async function emailScholarshipReport(snapshot: ReportSnapshot, pdf: Uint8Array, bookingUrl: string) {
  const config = reportRuntime();
  const leading = snapshot.matches.slice(0, 3).map((match, index) => `<li style="margin:0 0 10px"><strong>#${index + 1} ${escapeHtml(match.scholarship.name)}</strong><br><span style="color:#51606f">${escapeHtml(match.scholarship.country)} · ${match.score}% match · ${escapeHtml(match.label)}</span></li>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f8;font-family:Arial,sans-serif;color:#0d1f35"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:30px 14px"><table role="presentation" width="100%" style="max-width:640px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#0d1f35;padding:24px 30px;color:#fff"><strong style="font-size:18px">EG Consultancy</strong><div style="color:#eab34d;font-size:11px;margin-top:5px">PERSONAL SCHOLARSHIP REPORT</div></td></tr><tr><td style="padding:32px 30px"><h1 style="font-size:25px;line-height:1.2;margin:0 0 12px">Your 10 best scholarship matches are ready.</h1><p style="line-height:1.65;color:#51606f">Hello ${escapeHtml(snapshot.student.fullName)}, your profile has been compared with EG Consultancy's curated scholarship catalogue. Your attached report explains the strongest options, the gaps to resolve, and the next actions worth taking.</p><h2 style="font-size:17px;margin:26px 0 12px">Leading options</h2><ol style="padding-left:22px">${leading}</ol><a href="${escapeHtml(bookingUrl)}" style="display:inline-block;margin-top:16px;background:#00917d;color:#fff;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:7px">Book a free at-office consultation</a><p style="font-size:12px;line-height:1.55;color:#6d7884;margin-top:24px">Home Consultation (BDT 1,000) is planned for a future release. Scholarship rules change; always verify the official sources linked in your report. Results are guidance, not a guarantee of admission, funding or visa approval.</p></td></tr></table></td></tr></table></body></html>`;
  const subject = `${snapshot.student.fullName}, your EG Consultancy scholarship report is ready`;
  const text = `Hello ${snapshot.student.fullName}, your 10 best scholarship matches are ready. Your detailed EG Consultancy report is attached. Book a free at-office consultation: ${bookingUrl}`;
  const attachmentBase64 = base64(pdf);

  if (config.gmailWebhookUrl && config.gmailWebhookSecret) {
    const response = await fetch(config.gmailWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: config.gmailWebhookSecret,
        reportId: snapshot.id,
        to: snapshot.student.email,
        bcc: config.adminEmail,
        replyTo: config.replyTo,
        subject,
        html,
        text,
        filename: reportFilename(snapshot),
        attachmentBase64,
      }),
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean; id?: string; error?: string };
    if (!response.ok || !result.ok) {
      return { status: "failed" as const, providerId: "", error: String(result.error ?? `Gmail relay returned ${response.status}`).slice(0, 500) };
    }
    return { status: "sent" as const, providerId: result.id ?? snapshot.id, error: "" };
  }

  if (!config.apiKey || !config.from) return { status: "ready" as const, providerId: "", error: "Email delivery is not configured" };
  const payload: Record<string, unknown> = {
    from: config.from,
    to: [snapshot.student.email],
    subject,
    html,
    attachments: [{ filename: reportFilename(snapshot), content: attachmentBase64 }],
    tags: [{ name: "category", value: "scholarship-report" }, { name: "report_id", value: snapshot.id.replace(/-/g, "").slice(0, 64) }],
  };
  if (config.adminEmail) payload.bcc = [config.adminEmail];
  if (config.replyTo) payload.reply_to = config.replyTo;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `scholarship-report/${snapshot.id}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) return { status: "failed" as const, providerId: "", error: String(result.message ?? `Email provider returned ${response.status}`).slice(0, 500) };
  return { status: "sent" as const, providerId: result.id ?? "", error: "" };
}
