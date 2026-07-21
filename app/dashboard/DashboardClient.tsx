"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { scholarships, type ScholarshipMatch, type StudentProfile } from "../lib/matching";

type Tab = "overview" | "documents" | "profile" | "matches" | "applications" | "consultant";
type DocumentItem = { id: string; category: string; filename: string; mimeType?: string; sizeBytes: number; status: string; createdAt?: string };
type ApplicationItem = { scholarshipId: string; stage: string; nextAction: string; updatedAt?: string };
type ProgressItem = { stage: string; note: string; createdAt: string };

const emptyProfile: StudentProfile = { studyLevel: "", preferredCountries: [], field: "", gpa: "", englishTest: "", englishScore: "", budget: "", intake: "", workExperience: "", notes: "" };
const categories = [
  ["academic", "Academic", "Transcripts, certificates and mark sheets", "01"],
  ["language", "Language", "IELTS, TOEFL, PTE or Duolingo", "02"],
  ["financial", "Financial", "Bank and sponsor evidence", "03"],
  ["identity", "Identity", "Passport and identification", "04"],
  ["supporting", "Supporting", "CV, SOP, references and experience", "05"],
];

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function fileSize(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function friendlyCategory(value: string) { return categories.find(([id]) => id === value)?.[1] ?? value; }

export default function DashboardClient({ user, signOutPath }: { user: { name: string; email: string }; signOutPath: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("Start with your profile and essential documents. Your information saves to this account.");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultantSent, setConsultantSent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function readJson(response: Response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? "The request could not be completed");
    return payload;
  }

  useEffect(() => {
    Promise.all([fetch("/api/workspace").then(readJson), fetch("/api/documents").then(readJson)])
      .then(([workspace, documentData]) => {
        setProfile({ ...emptyProfile, ...(workspace.profile ?? {}) });
        setMatches(workspace.matches ?? []);
        setApplications(workspace.applications ?? []);
        setProgress(workspace.progress ?? []);
        setAiConfigured(Boolean(workspace.aiConfigured));
        setDocuments(documentData.documents ?? []);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Workspace could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  const completeness = useMemo(() => {
    const fields = [profile.studyLevel, profile.field, profile.gpa, profile.englishScore, profile.intake, profile.preferredCountries?.length];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);
  const categoryCount = useMemo(() => new Set(documents.map((doc) => doc.category)).size, [documents]);

  async function uploadDocument(data: FormData) {
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/documents", { method: "POST", body: data }));
      setDocuments((current) => [payload.document, ...current]);
      setNotice(`${payload.document.filename} uploaded securely. It is ready for profile analysis.`);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed");
      return false;
    } finally { setBusy(false); }
  }

  async function removeDocument(id: string, filename: string) {
    if (!window.confirm(`Remove ${filename} from your document vault? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await readJson(await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
      setDocuments((current) => current.filter((document) => document.id !== id));
      setNotice(`${filename} was removed from your document vault.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Document could not be removed");
    } finally {
      setDeletingId(null);
    }
  }

  async function saveProfile() {
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) }));
      setNotice(`Profile saved. Readiness is now ${payload.completeness}%.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Profile could not be saved"); }
    finally { setBusy(false); }
  }

  async function runMatch() {
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, consentToAiDocumentReview: consent }) }));
      setProfile({ ...emptyProfile, ...payload.profile });
      setMatches(payload.results ?? []);
      setNotice(payload.notice);
      setTab("matches");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Profile analysis failed"); }
    finally { setBusy(false); }
  }

  async function updateApplication(scholarshipId: string, stage: string) {
    const actions: Record<string, string> = { shortlisted: "Review eligibility", preparing: "Complete document checklist", submitted: "Track university response", decision: "Review offer and funding" };
    try {
      const payload = await readJson(await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scholarshipId, stage, nextAction: actions[stage] }) }));
      setApplications((current) => [payload.application, ...current.filter((item) => item.scholarshipId !== scholarshipId)]);
      setNotice("Application stage updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Application could not be updated"); }
  }

  async function requestConsultant() {
    setBusy(true);
    try {
      await readJson(await fetch("/api/consultant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Please review my current Top Five shortlist and advise the next application steps." }) }));
      setConsultantSent(true);
      setNotice("Your consultant review request has been recorded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request could not be sent"); }
    finally { setBusy(false); }
  }

  const navItems: Array<[Tab, string, string]> = [["overview", "01", "Overview"], ["documents", "02", "Documents"], ["profile", "03", "My profile"], ["matches", "04", "Top Five"], ["applications", "05", "Applications"], ["consultant", "06", "Consultant"]];
  if (loading) return <main className="workspace-loading"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><strong>Preparing your secure workspace</strong><i /></main>;

  return <main className="dashboard-shell">
    <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
      <Link className="brand dashboard-brand" href="/"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>Student workspace</small></span></Link>
      <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
      <p className="nav-label">YOUR JOURNEY</p>
      <nav>{navItems.map(([id, icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setSidebarOpen(false); }}><span>{icon}</span>{label}{id === "matches" && matches.length > 0 && <i>{matches.length}</i>}{id === "documents" && documents.length > 0 && <i>{documents.length}</i>}</button>)}</nav>
      <div className="sidebar-progress"><div><span>Profile readiness</span><b>{completeness}%</b></div><div className="progress-track"><i style={{ width: `${completeness}%` }} /></div><small>{completeness >= 80 ? "Ready for a meaningful match" : "Complete core profile fields"}</small></div>
      <div className="sidebar-help"><span>?</span><div><b>Need a second opinion?</b><small>Ask an EG consultant</small></div><button onClick={() => setTab("consultant")}>→</button></div>
    </aside>

    <section className="dashboard-content">
      <header className="dashboard-topbar"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button><div><small>EG SCHOLARSHIPS BD</small><strong>{navItems.find(([id]) => id === tab)?.[2]}</strong></div><div className="top-actions"><div className="secure-pill"><span /> Secure workspace</div><div className="user-chip"><span>{initials(user.name)}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><a href={signOutPath}>Sign out</a></div></header>
      <div className="dashboard-body">
        <div className="page-heading"><div><span className="eyebrow">{tab === "overview" ? "YOUR ACTION CENTRE" : "STUDENT WORKSPACE"}</span><h1>{tab === "overview" ? `Welcome back, ${user.name.split(" ")[0]}.` : navItems.find(([id]) => id === tab)?.[2]}</h1><p>{tab === "overview" ? "Your priorities, evidence and application progress in one place." : notice}</p></div>{tab === "overview" && <button className="button primary compact" onClick={() => setTab(completeness < 80 ? "profile" : "matches")}>{completeness < 80 ? "Complete my profile" : "Review my Top Five"}<span>→</span></button>}</div>
        {tab === "overview" && <Overview documents={documents} matches={matches} completeness={completeness} categoryCount={categoryCount} applications={applications} progress={progress} onNavigate={setTab} />}
        {tab === "documents" && <Documents documents={documents} busy={busy} deletingId={deletingId} notice={notice} onUpload={uploadDocument} onDelete={removeDocument} />}
        {tab === "profile" && <Profile profile={profile} setProfile={setProfile} consent={consent} setConsent={setConsent} documents={documents.length} busy={busy} aiConfigured={aiConfigured} onSave={saveProfile} onRun={runMatch} />}
        {tab === "matches" && <Matches matches={matches} notice={notice} onProfile={() => setTab("profile")} onConsultant={() => setTab("consultant")} onTrack={(id) => { updateApplication(id, "shortlisted"); setTab("applications"); }} />}
        {tab === "applications" && <Applications matches={matches} applications={applications} onUpdate={updateApplication} />}
        {tab === "consultant" && <Consultant sent={consultantSent} busy={busy} onRequest={requestConsultant} />}
      </div>
    </section>
  </main>;
}

function Overview({ documents, matches, completeness, categoryCount, applications, progress, onNavigate }: { documents: DocumentItem[]; matches: ScholarshipMatch[]; completeness: number; categoryCount: number; applications: ApplicationItem[]; progress: ProgressItem[]; onNavigate: (tab: Tab) => void }) {
  const nextTab: Tab = completeness < 80 ? "profile" : documents.length < 2 ? "documents" : matches.length ? "matches" : "profile";
  const nextTitle = completeness < 80 ? "Complete your core profile" : documents.length < 2 ? "Add supporting documents" : matches.length ? "Review and compare your Top Five" : "Generate your first Top Five";
  return <>
    <section className="action-hero"><div><span className="section-kicker">RECOMMENDED NEXT ACTION</span><h2>{nextTitle}</h2><p>{completeness < 80 ? "A stronger profile produces a more useful shortlist." : "Keep your evidence and priorities current before moving forward."}</p><button className="button light" onClick={() => onNavigate(nextTab)}>Continue now →</button></div><div className="readiness-dial"><strong>{completeness}%</strong><span>profile ready</span></div></section>
    <div className="metric-grid"><article><span className="metric-icon teal">DOC</span><div><small>DOCUMENT VAULT</small><strong>{documents.length} files</strong><p>{categoryCount} of 5 evidence categories</p></div><button onClick={() => onNavigate("documents")}>→</button></article><article><span className="metric-icon gold">TOP</span><div><small>SMART SHORTLIST</small><strong>{matches.length ? `${matches.length} matches` : "Not generated"}</strong><p>{matches.length ? "Evidence-led ranking" : "Profile required first"}</p></div><button onClick={() => onNavigate("matches")}>→</button></article><article><span className="metric-icon blue">APP</span><div><small>APPLICATIONS</small><strong>{applications.length} tracked</strong><p>Live stage and next action</p></div><button onClick={() => onNavigate("applications")}>→</button></article></div>
    <div className="dashboard-two-col"><section className="panel journey-panel"><div className="panel-head"><div><span className="section-kicker">YOUR ROADMAP</span><h2>Progress without guesswork.</h2></div><span>{[completeness >= 80, documents.length >= 2, matches.length >= 5, applications.length > 0].filter(Boolean).length} / 4 complete</span></div>{[[completeness >= 80, "Profile essentials", completeness >= 80 ? "Core preferences saved" : "Add results, intake and destinations", "profile"], [documents.length >= 2, "Evidence ready", documents.length ? `${documents.length} secure files uploaded` : "Start with transcripts and English evidence", "documents"], [matches.length >= 5, "Top Five generated", matches.length ? "Shortlist ready for review" : "Run profile matching", "matches"], [applications.length > 0, "Application plan", applications.length ? `${applications.length} option${applications.length === 1 ? "" : "s"} tracked` : "Move a shortlist option into tracking", "applications"]].map(([done, title, text, destination], index) => <button className={`roadmap-step ${done ? "done" : ""}`} key={String(title)} onClick={() => onNavigate(destination as Tab)}><b>{done ? "✓" : index + 1}</b><span><strong>{title as string}</strong><small>{text as string}</small></span><i>→</i></button>)}</section>
      <section className="panel activity-panel"><div className="panel-head"><div><span className="section-kicker">RECENT ACTIVITY</span><h2>Your workspace history</h2></div></div>{progress.length ? progress.map((item) => <article key={`${item.stage}-${item.createdAt}`}><span /><div><strong>{item.stage}</strong><small>{item.note}</small></div></article>) : <div className="empty-state compact-empty"><b>◎</b><strong>Your activity will appear here</strong><p>Uploads, matches and consultant updates create a clear audit trail.</p></div>}</section></div>
    <section className="panel catalogue-strip"><div><span className="section-kicker">CURATED DATABASE</span><h2>{scholarships.length} source-backed opportunities</h2><p>Built from the two supplied research workbooks. Deadlines and eligibility must still be rechecked on official pages before applying.</p></div><div className="catalogue-stats"><span><b>{new Set(scholarships.map((item) => item.country)).size}</b> destinations</span><span><b>{scholarships.filter((item) => /high/i.test(item.confidence)).length}</b> high-confidence</span><span><b>5</b> prioritized for you</span></div></section>
  </>;
}

function Documents({ documents, busy, deletingId, notice, onUpload, onDelete }: { documents: DocumentItem[]; busy: boolean; deletingId: string | null; notice: string; onUpload: (data: FormData) => Promise<boolean>; onDelete: (id: string, filename: string) => Promise<void> }) {
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState("academic");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected) return; const form = event.currentTarget; const data = new FormData(); data.set("category", category); data.set("file", selected); if (await onUpload(data)) { setSelected(null); form.reset(); } }
  return <><section className="document-guide"><div><span className="section-kicker">DOCUMENT CHECKLIST</span><h2>Build a complete evidence vault.</h2><p>Upload clear, complete files. You control when AI may read them.</p></div><div className="category-cards">{categories.map(([id, label, text, number]) => { const count = documents.filter((doc) => doc.category === id).length; return <article key={id} className={count ? "complete" : ""}><span>{count ? "✓" : number}</span><div><strong>{label}</strong><small>{text}</small></div><b>{count}</b></article>; })}</div></section>
    <div className="dashboard-two-col documents-layout"><section className="panel"><div className="panel-head"><div><span className="section-kicker">SECURE UPLOAD</span><h2>Add a document</h2></div><span className="privacy-chip">Private to your account</span></div><form className="upload-form" onSubmit={submit}><label>Document category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className={`drop-zone ${dragging ? "dragging" : ""}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDrop={() => setDragging(false)}><span>↑</span><strong>{selected ? selected.name : "Drop a file here or choose from your device"}</strong><small>{selected ? `${fileSize(selected.size)} ready to upload` : "PDF, DOC, DOCX, JPG or PNG — up to 20 MB"}</small><input type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setSelected(event.target.files?.[0] ?? null)} required /></label><button className="button primary" disabled={busy || !selected}>{busy ? "Uploading securely..." : selected ? "Upload this document" : "Choose a document first"}</button><p className="form-notice" role="status">{notice}</p></form></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">YOUR FILES</span><h2>{documents.length} document{documents.length === 1 ? "" : "s"} stored</h2></div></div><div className="document-list">{documents.length ? documents.map((doc) => <article key={doc.id}><span>{doc.filename.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span><div><strong>{doc.filename}</strong><small>{friendlyCategory(doc.category)} · {fileSize(doc.sizeBytes)}</small></div><i>{doc.status === "analyzed" ? "AI reviewed" : "Ready"}</i><div className="document-actions"><a href={`/api/documents/download?id=${encodeURIComponent(doc.id)}`} target="_blank" rel="noreferrer">Open</a><button type="button" onClick={() => onDelete(doc.id, doc.filename)} disabled={deletingId === doc.id}>{deletingId === doc.id ? "Removing..." : "Remove"}</button></div></article>) : <div className="empty-state"><b>↑</b><strong>No documents uploaded yet</strong><p>Start with your latest transcript and English-test report.</p></div>}</div></section></div></>;
}

function Profile({ profile, setProfile, consent, setConsent, documents, busy, aiConfigured, onSave, onRun }: { profile: StudentProfile; setProfile: (profile: StudentProfile) => void; consent: boolean; setConsent: (value: boolean) => void; documents: number; busy: boolean; aiConfigured: boolean; onSave: () => void; onRun: () => void }) {
  const update = (key: keyof StudentProfile, value: string | string[]) => setProfile({ ...profile, [key]: value });
  return <section className="panel profile-panel"><div className="profile-intro"><div><span className="section-kicker">PROFILE BUILDER</span><h2>Tell us what a document cannot.</h2><p>Save your preferences first. When you choose AI review, extracted facts are combined with — but never silently replace — your answers.</p></div><span className={`ai-badge ${aiConfigured ? "" : "warning"}`}>{aiConfigured ? "AI document reading available" : "Profile matching available; document AI pending setup"}</span></div><div className="profile-grid"><label>Study level<select value={profile.studyLevel ?? ""} onChange={(e) => update("studyLevel", e.target.value)}><option value="">Select your target</option><option>Bachelor</option><option>Master</option><option>Doctoral</option></select></label><label>Target intake<input value={profile.intake ?? ""} onChange={(e) => update("intake", e.target.value)} placeholder="e.g. September 2027" /></label><label>Subject / field<input value={profile.field ?? ""} onChange={(e) => update("field", e.target.value)} placeholder="e.g. Data Science" /></label><label>Preferred countries<input value={profile.preferredCountries?.join(", ") ?? ""} onChange={(e) => update("preferredCountries", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="UK, Germany, Finland" /></label><label>GPA / academic result<input value={profile.gpa ?? ""} onChange={(e) => update("gpa", e.target.value)} placeholder="e.g. 3.62 / 4.00" /></label><label>English test<select value={profile.englishTest ?? ""} onChange={(e) => update("englishTest", e.target.value)}><option value="">Not taken yet</option><option>IELTS</option><option>TOEFL</option><option>PTE</option><option>Duolingo</option></select></label><label>English score<input value={profile.englishScore ?? ""} onChange={(e) => update("englishScore", e.target.value)} placeholder="e.g. IELTS 7.0" /></label><label>Available budget<input value={profile.budget ?? ""} onChange={(e) => update("budget", e.target.value)} placeholder="BDT amount or range" /></label><label>Work experience<input value={profile.workExperience ?? ""} onChange={(e) => update("workExperience", e.target.value)} placeholder="e.g. 2 years in software" /></label><label>Priorities or constraints<input value={profile.notes ?? ""} onChange={(e) => update("notes", e.target.value)} placeholder="Funding priority, family needs, subject focus" /></label></div><label className={`consent-card ${consent ? "checked" : ""} ${!aiConfigured ? "disabled" : ""}`}><input type="checkbox" checked={consent} disabled={!aiConfigured || documents === 0} onChange={(e) => setConsent(e.target.checked)} /><span>✓</span><div><strong>Use my uploaded documents for this analysis</strong><p>With your consent, recent documents are sent securely to the configured AI provider to extract supported facts. Unnecessary account numbers and unrelated sensitive records should not be uploaded.</p><small>{documents} document{documents === 1 ? "" : "s"} available · {aiConfigured ? "AI service connected" : "AI service not yet connected"}</small></div></label><div className="profile-actions"><button className="button ghost" onClick={onSave} disabled={busy}>{busy ? "Saving..." : "Save profile"}</button><button className="button primary match-button" onClick={onRun} disabled={busy}>{busy ? "Analyzing profile..." : "Generate my Top Five"}<span>✦</span></button></div></section>;
}

function Matches({ matches, notice, onProfile, onConsultant, onTrack }: { matches: ScholarshipMatch[]; notice: string; onProfile: () => void; onConsultant: () => void; onTrack: (id: string) => void }) {
  if (!matches.length) return <section className="panel large-empty"><span>✦</span><h2>Your Top Five starts with your profile.</h2><p>Complete the core fields, upload any supporting evidence you want to use, then generate a ranked shortlist.</p><button className="button primary" onClick={onProfile}>Complete my profile</button></section>;
  return <><div className="match-notice"><span>i</span><p>{notice} Match labels support decisions and do not guarantee admission, scholarships or visas.</p></div><div className="matches-list">{matches.map((match, index) => <article className="match-card" key={match.scholarship.id}><div className="rank-block"><span>#{index + 1}</span><div className="score-ring small"><b>{match.score}</b><small>/100</small></div></div><div className="match-details"><span className={`match-label ${match.label === "Strong match" ? "strong" : ""}`}>{match.label}</span><h2>{match.scholarship.name}</h2><p className="provider">{match.scholarship.provider} · {match.scholarship.country}</p><div className="match-meta"><span>{match.scholarship.studyLevel}</span><span>{match.scholarship.coverage || "Funding varies"}</span><span>{match.scholarship.status}</span></div><p>{match.rationale}</p>{match.gaps.length > 0 && <div className="gap-row"><b>Verify:</b>{match.gaps.map((gap) => <span key={gap}>{gap}</span>)}</div>}</div><div className="match-side"><strong>{match.scholarship.deadline || "Annual cycle"}</strong><small>deadline / cycle</small><a href={match.scholarship.officialSource} target="_blank" rel="noreferrer">Official source ↗</a><button onClick={() => onTrack(match.scholarship.id)}>Track option</button></div></article>)}</div><div className="consultant-cta"><div><span className="section-kicker">READY FOR A HUMAN CHECK?</span><h2>Send this shortlist to an EG consultant.</h2><p>A consultant can verify requirements, costs, document gaps and application timing.</p></div><button className="button primary" onClick={onConsultant}>Request consultant review →</button></div></>;
}

function Applications({ matches, applications, onUpdate }: { matches: ScholarshipMatch[]; applications: ApplicationItem[]; onUpdate: (id: string, stage: string) => void }) {
  const tracked = applications.map((application) => ({ application, match: matches.find((item) => item.scholarship.id === application.scholarshipId) })).filter((item) => item.match);
  if (!tracked.length) return <section className="panel large-empty"><span>◎</span><h2>No applications tracked yet.</h2><p>Open your Top Five and choose “Track option” to start a live application workflow.</p></section>;
  return <section className="panel"><div className="panel-head"><div><span className="section-kicker">APPLICATION TRACKER</span><h2>Move each option through a clear workflow.</h2></div><span>{tracked.length} active</span></div><div className="application-board">{tracked.map(({ application, match }) => <article key={application.scholarshipId}><div><span>{match!.scholarship.country}</span><h3>{match!.scholarship.name}</h3><p>{application.nextAction}</p></div><label>Current stage<select value={application.stage} onChange={(event) => onUpdate(application.scholarshipId, event.target.value)}><option value="shortlisted">Shortlisted</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="decision">Decision received</option></select></label><a href={match!.scholarship.officialSource} target="_blank" rel="noreferrer">Check official source ↗</a></article>)}</div></section>;
}

function Consultant({ sent, busy, onRequest }: { sent: boolean; busy: boolean; onRequest: () => void }) {
  return <div className="dashboard-two-col"><section className="panel consultant-panel"><span className="consultant-avatar">EG</span><span className="section-kicker">EXCELLENCE GLOBAL CONSULTANCY</span><h2>Turn your shortlist into an application plan.</h2><p>A consultant review checks profile evidence, current official requirements, budget fit, deadlines and application sequencing.</p><ul><li>Top Five eligibility and risk review</li><li>Document gap checklist</li><li>Safe, Match and Ambitious balance</li><li>Next-step consultation plan</li></ul><button className="button primary" disabled={busy || sent} onClick={onRequest}>{sent ? "Review requested ✓" : busy ? "Sending..." : "Request consultant review"}</button></section><section className="panel contact-card"><span className="section-kicker">CONTACT</span><h2>EG Consultancy, Dhaka</h2><p>House 22, Road 1, Block Ta, Pallabi, Mirpur, Dhaka 1216, Bangladesh</p><a href="tel:+8801928207111">+880 1928-207111</a><a href="https://wa.me/8801601247111">WhatsApp +880 1601-247111</a><a href="mailto:ceo.egconsulting@gmail.com">ceo.egconsulting@gmail.com</a><small>Consultants verify live requirements before advising. No admission, scholarship or visa outcome is guaranteed.</small></section></div>;
}
