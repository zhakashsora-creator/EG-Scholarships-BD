import { NextResponse } from "next/server";
import { getStudentUser } from "../../lib/auth";
import { database, ensureSchema } from "../../lib/storage";

const stages = new Set(["shortlisted", "application", "admission", "visa", "predeparture", "arrived"]);
const workflowKeys = new Set(["applicationSubmitted", "admissionOfferReceived", "visaApplicationSubmitted", "visaDecisionReceived", "tuitionPaid", "outstandingFees", "flightBooked", "flightDetails", "insuranceArranged", "insuranceFee", "accommodationArranged", "accommodationDetails", "notes"]);

function sanitizedWorkflow(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, string | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!workflowKeys.has(key)) continue;
    if (typeof item === "boolean") output[key] = item;
    if (typeof item === "string") output[key] = item.trim().slice(0, 500);
  }
  return output;
}

export async function POST(request: Request) {
  const user = await getStudentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as { scholarshipId?: string; stage?: string; nextAction?: string; workflow?: unknown };
  if (!body.scholarshipId || !body.stage || !stages.has(body.stage)) return NextResponse.json({ error: "Invalid application update" }, { status: 400 });
  const nextAction = (body.nextAction ?? "Review with consultant").trim().slice(0, 240);
  const workflow = sanitizedWorkflow(body.workflow);
  await ensureSchema();
  const id = crypto.randomUUID();
  await database().prepare(`INSERT INTO applications (id, owner_email, scholarship_id, stage, next_action, workflow_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(owner_email, scholarship_id) DO UPDATE SET stage=excluded.stage, next_action=excluded.next_action, workflow_json=excluded.workflow_json, updated_at=CURRENT_TIMESTAMP`)
    .bind(id, user.email, body.scholarshipId, body.stage, nextAction, JSON.stringify(workflow)).run();
  return NextResponse.json({ application: { scholarshipId: body.scholarshipId, stage: body.stage, nextAction, workflow } });
}
