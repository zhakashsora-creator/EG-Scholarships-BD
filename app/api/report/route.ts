import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, ensureSchema } from "../../lib/storage";
import {
  buildScholarshipReportPdf,
  consultationUrl,
  emailScholarshipReport,
  isReportEmailConfigured,
  reportFilename,
  type ReportSnapshot,
} from "../../lib/scholarship-report";

type ReportRow = {
  id: string;
  recipientEmail: string;
  status: string;
  snapshotJson: string;
  createdAt: string;
  sentAt: string | null;
};

function publicReport(row: Pick<ReportRow, "id" | "recipientEmail" | "status" | "createdAt" | "sentAt">) {
  const message = row.status === "sent"
    ? `Your detailed report was emailed to ${row.recipientEmail}.`
    : row.status === "failed"
      ? "Your report is ready to download, but email delivery needs attention."
      : "Your report is ready to download. Email delivery is waiting for site setup.";
  return {
    id: row.id,
    status: row.status,
    recipientEmail: row.recipientEmail,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    downloadUrl: `/api/report?id=${encodeURIComponent(row.id)}`,
    emailConfigured: isReportEmailConfigured(),
    message,
  };
}

async function findReport(ownerEmail: string, id?: string | null) {
  const query = id
    ? database().prepare(`SELECT id, recipient_email AS recipientEmail, status, snapshot_json AS snapshotJson,
        created_at AS createdAt, sent_at AS sentAt FROM scholarship_reports WHERE owner_email = ? AND id = ?`).bind(ownerEmail, id)
    : database().prepare(`SELECT id, recipient_email AS recipientEmail, status, snapshot_json AS snapshotJson,
        created_at AS createdAt, sent_at AS sentAt FROM scholarship_reports WHERE owner_email = ? ORDER BY created_at DESC LIMIT 1`).bind(ownerEmail);
  return query.first<ReportRow>();
}

export async function GET(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const id = new URL(request.url).searchParams.get("id");
  const row = await findReport(user.email, id);
  if (!row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  let snapshot: ReportSnapshot;
  try { snapshot = JSON.parse(row.snapshotJson) as ReportSnapshot; }
  catch { return NextResponse.json({ error: "Report could not be read" }, { status: 500 }); }
  const pdf = await buildScholarshipReportPdf(snapshot, consultationUrl(new URL(request.url).origin));
  const copy = new Uint8Array(pdf.byteLength);
  copy.set(pdf);
  return new Response(copy.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFilename(snapshot)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await ensureSchema();
  const body = await request.json().catch(() => ({})) as { id?: string };
  const row = await findReport(user.email, typeof body.id === "string" ? body.id : null);
  if (!row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  let snapshot: ReportSnapshot;
  try { snapshot = JSON.parse(row.snapshotJson) as ReportSnapshot; }
  catch { return NextResponse.json({ error: "Report could not be read" }, { status: 500 }); }
  if (!isReportEmailConfigured()) return NextResponse.json(publicReport({ ...row, status: "ready" }));
  const bookingUrl = consultationUrl(new URL(request.url).origin);
  const pdf = await buildScholarshipReportPdf(snapshot, bookingUrl);
  const delivery = await emailScholarshipReport(snapshot, pdf, bookingUrl);
  await database().prepare(`UPDATE scholarship_reports SET status = ?, provider_id = ?, error_message = ?,
    sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id = ? AND owner_email = ?`)
    .bind(delivery.status, delivery.providerId || null, delivery.error || null, delivery.status, row.id, user.email).run();
  return NextResponse.json(publicReport({ ...row, status: delivery.status, sentAt: delivery.status === "sent" ? new Date().toISOString() : row.sentAt }));
}

