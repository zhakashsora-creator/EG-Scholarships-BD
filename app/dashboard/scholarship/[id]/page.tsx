/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ThemeToggle from "../../../components/ThemeToggle";
import { getStudentUser } from "../../../lib/auth";
import { buildCostPlan, buildFitChecks, buildNextSteps } from "../../../lib/scholarship-analysis";
import { buildAvailableMatches, type ScholarshipMatch, type StudentProfile } from "../../../lib/matching";
import { getScholarshipById, getScholarshipCatalogue } from "../../../lib/scholarship-catalogue";
import { database, ensureSchema } from "../../../lib/storage";

export const dynamic = "force-dynamic";

export default async function ScholarshipAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getStudentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { id } = await params;
  const scholarship = await getScholarshipById(decodeURIComponent(id));
  if (!scholarship) notFound();

  await ensureSchema();
  const [student, row, trackedApplication] = await Promise.all([
    database().prepare(`SELECT profile_json AS profileJson FROM students WHERE email = ?`)
      .bind(user.email).first<{ profileJson: string }>(),
    database().prepare(`SELECT rank, score, rationale, gaps_json AS gapsJson FROM matches WHERE owner_email = ? AND scholarship_id = ?`)
      .bind(user.email, scholarship.id).first<{ rank: number; score: number; rationale: string; gapsJson: string }>(),
    database().prepare(`SELECT scholarship_id AS scholarshipId FROM applications WHERE owner_email = ? AND scholarship_id = ?`)
      .bind(user.email, scholarship.id).first<{ scholarshipId: string }>(),
  ]);
  if (!row && !trackedApplication) notFound();

  let profile: StudentProfile = {};
  let gaps: string[] = [];
  try { profile = student?.profileJson ? JSON.parse(student.profileJson) : {}; } catch { profile = {}; }
  try { gaps = row?.gapsJson ? JSON.parse(row.gapsJson) : []; } catch { gaps = []; }
  const computed = buildAvailableMatches(profile, new Date(), await getScholarshipCatalogue()).find((match) => match.scholarship.id === scholarship.id);
  if (!gaps.length && computed?.gaps.length) gaps = computed.gaps;
  const label: ScholarshipMatch["label"] | "Tracked" = computed?.label ?? "Tracked";
  const score = row?.score ?? computed?.score ?? null;
  const rationale = row?.rationale ?? "You saved this scholarship to Applications. It is no longer in your current Best Finds, but its official-source record and your application workflow remain available here.";
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
          <span className="eyebrow">{row ? `BEST FINDS · #${row.rank} FOR YOUR PROFILE` : "TRACKED APPLICATION · SAVED WORK PRESERVED"}</span>
          <h1>{scholarship.name}</h1>
          <p>{scholarship.provider} · {scholarship.country}</p>
          <div className="analysis-tags"><span>{scholarship.studyLevel}</span><span>{scholarship.coverage || "Funding varies"}</span><span>{scholarship.status}</span></div>
        </div>
        <div className="analysis-score"><strong>{score ?? "Saved"}</strong>{score !== null && <small>/100</small>}<span>{label}</span></div>
      </section>

      <div className="analysis-alert"><b>Profile-aware guidance</b><p>This page is generated from your saved profile, the ranked-match evidence and the stored official-source record. Recheck all live requirements, fees and deadlines before applying; this analysis is not an admission, scholarship or visa guarantee.</p></div>

      {scholarship.overallSummary && (
        <section className="analysis-card overall-summary-card">
          <span className="section-kicker">OVERALL SCHOLARSHIP SUMMARY</span>
          <h2>Executive overview at a glance</h2>
          {typeof scholarship.overallSummary === "object" ? (
            <div className="overall-summary-grid">
              <div className="summary-block cost-block">
                <span className="summary-pill">🏷️ Tuition & Direct Costs</span>
                <p>{scholarship.overallSummary.cost || scholarship.fundingSummary || "Check official award notice"}</p>
              </div>
              <div className="summary-block benefits-block">
                <span className="summary-pill">💰 Stipend & Allowances</span>
                <p>{scholarship.overallSummary.benefits || scholarship.coverage || "Check official award notice"}</p>
              </div>
              <div className="summary-block logistics-block">
                <span className="summary-pill">📌 Key Logistics & Criteria</span>
                <p>{scholarship.overallSummary.other || scholarship.academicCriteria || "Check official award notice"}</p>
              </div>
            </div>
          ) : (
            <p className="summary-text">{scholarship.overallSummary}</p>
          )}
        </section>
      )}

      <section className="analysis-grid">
        <article className="analysis-card analysis-summary">
          <span className="section-kicker">WHY THIS WAS SELECTED</span>
          <h2>The evidence behind your ranking</h2>
          <p>{rationale}</p>
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
          <div className="budget-note"><b>Your stated budget</b><span>{profile.budget ? `${profile.budgetCurrency || "BDT"} ${profile.budget}` : "Not added to the profile"}</span></div>
        </aside>
      </section>

      {computed && score !== null && <section className="analysis-card">
        <span className="section-kicker">WEIGHTED MATCH SCORE</span>
        <h2>Where the {score}/100 score comes from</h2>
        <div className="subscore-grid">{Object.entries(computed.subScores).map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong></div>)}</div>
      </section>}

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
