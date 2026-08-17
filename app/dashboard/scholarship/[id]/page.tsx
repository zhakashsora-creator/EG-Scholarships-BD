/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { getStudentUser } from "../../../lib/auth";
import { buildCostPlan, buildFitChecks, buildNextSteps } from "../../../lib/scholarship-analysis";
import { scholarships, type ScholarshipMatch, type StudentProfile } from "../../../lib/matching";
import { database, ensureSchema } from "../../../lib/storage";

export const dynamic = "force-dynamic";

export default async function ScholarshipAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { id } = await params;
  const scholarship = scholarships.find((item) => item.id === decodeURIComponent(id));
  if (!scholarship) notFound();

  await ensureSchema();
  const [student, row] = await Promise.all([
    database().prepare(`SELECT profile_json AS profileJson FROM students WHERE email = ?`)
      .bind(user.email).first<{ profileJson: string }>(),
    database().prepare(`SELECT rank, score, rationale, gaps_json AS gapsJson FROM matches WHERE owner_email = ? AND scholarship_id = ?`)
      .bind(user.email, scholarship.id).first<{ rank: number; score: number; rationale: string; gapsJson: string }>(),
  ]);
  if (!row) notFound();

  let profile: StudentProfile = {};
  let gaps: string[] = [];
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  try { gaps = JSON.parse(row.gapsJson); } catch { gaps = []; }
  const label: ScholarshipMatch["label"] = row.score >= 80 ? "Strong match" : row.score >= 64 ? "Possible match" : "Review required";
  const fitChecks = buildFitChecks(profile, scholarship);
  const costPlan = buildCostPlan(scholarship);
  const nextSteps = buildNextSteps(scholarship);

  return (
    <main className="analysis-page">
      <header className="analysis-header">
        <Link className="brand" href="/dashboard"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>Personal match analysis</small></span></Link>
        <div><ThemeToggle /><Link className="button ghost compact" href="/dashboard?tab=matches">← Back to Best Finds</Link></div>
      </header>

      <section className="analysis-hero">
        <div>
          <span className="eyebrow">BEST FINDS · #{row.rank} FOR YOUR PROFILE</span>
          <h1>{scholarship.name}</h1>
          <p>{scholarship.provider} · {scholarship.country}</p>
          <div className="analysis-tags"><span>{scholarship.studyLevel}</span><span>{scholarship.coverage || "Funding varies"}</span><span>{scholarship.status}</span></div>
        </div>
        <div className="analysis-score"><strong>{row.score}</strong><small>/100</small><span>{label}</span></div>
      </section>

      <div className="analysis-alert"><b>Profile-aware guidance</b><p>This page is generated from your saved profile, the ranked-match evidence and the stored official-source record. Recheck all live requirements, fees and deadlines before applying; this analysis is not an admission, scholarship or visa guarantee.</p></div>

      <section className="analysis-grid">
        <article className="analysis-card analysis-summary">
          <span className="section-kicker">WHY THIS WAS SELECTED</span>
          <h2>The evidence behind your ranking</h2>
          <p>{row.rationale}</p>
          <dl>
            <div><dt>Funding recorded</dt><dd>{scholarship.fundingSummary || scholarship.coverage || "Verify on the official source"}</dd></div>
            <div><dt>Deadline / cycle</dt><dd>{scholarship.deadline || "Annual or programme-specific"} · {scholarship.deadlineTimezone || scholarship.status}</dd></div>
            <div><dt>Application route</dt><dd>{scholarship.applicationRoute || "Use the official source"}</dd></div>
            <div><dt>Source verification</dt><dd>{scholarship.confidence || "Review required"} confidence · checked {scholarship.verifiedAt || "date not recorded"}</dd></div>
          </dl>
          <a className="button primary" href={scholarship.officialSource} target="_blank" rel="noreferrer">Open official source ↗</a>
        </article>

        <aside className="analysis-card analysis-risks">
          <span className="section-kicker">DECISION CHECK</span>
          <h2>What still needs verification</h2>
          {gaps.length ? <ul>{gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : <p>No specific scoring gaps were recorded. Live eligibility and availability still require a final check.</p>}
          <div className="budget-note"><b>Your stated budget</b><span>{profile.budget || "Not added to the profile"}</span></div>
        </aside>
      </section>

      <section className="analysis-card">
        <span className="section-kicker">PROFILE VS REQUIREMENTS</span>
        <h2>How your current profile compares</h2>
        <div className="fit-table">
          <div className="fit-head"><b>Decision area</b><b>Your profile</b><b>Stored requirement</b><b>Position</b></div>
          {fitChecks.map((check) => <div className="fit-row" key={check.label}><strong>{check.label}</strong><span>{check.student}</span><span>{check.requirement}</span><i className={check.status.toLowerCase().replace(" ", "-")}>{check.status}</i></div>)}
        </div>
      </section>

      <section className="analysis-card">
        <span className="section-kicker">DETAILED COST PLAN</span>
        <h2>Separate covered, unconfirmed and student-paid costs</h2>
        <p className="analysis-intro">The source record does not contain dependable live prices for every item, so the breakdown identifies the funding position and the exact quote or official figure you still need to collect.</p>
        <div className="cost-grid">{costPlan.map((cost) => <article key={cost.item}><h3>{cost.item}</h3><b>{cost.awardPosition}</b><p>{cost.planningAction}</p></article>)}</div>
      </section>

      <section className="analysis-card">
        <span className="section-kicker">YOUR NEXT STEPS</span>
        <h2>From shortlist to arrival</h2>
        <div className="detailed-steps">{nextSteps.map(([title, description], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
        <div className="analysis-actions"><Link className="button primary" href="/dashboard?tab=applications">Track this application →</Link><Link className="button ghost" href="/dashboard?tab=consultant">Ask an EG consultant</Link></div>
      </section>
    </main>
  );
}
