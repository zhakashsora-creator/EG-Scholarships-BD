"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { rankScholarships, scholarships, type ScholarshipMatch, type StudentProfile } from "../lib/matching";

type Tab = "overview" | "documents" | "profile" | "matches" | "applications" | "consultant";
type DocumentItem = { id: string; category: string; filename: string; sizeBytes: number; status: string; createdAt?: string };

const demoProfile: StudentProfile = {
  studyLevel: "Master", preferredCountries: ["United Kingdom", "Germany", "Finland"], field: "Data Science",
  gpa: "3.62 / 4.00", englishTest: "IELTS", englishScore: "7.0", budget: "৳18–25 lakh", intake: "2027",
  workExperience: "2 years", notes: "Preference for fully funded or substantial tuition support.",
};

const categories = [
  ["academic", "Academic", "Transcripts, certificates, mark sheets"],
  ["language", "Language", "IELTS, TOEFL or other test reports"],
  ["financial", "Financial", "Bank and sponsor evidence"],
  ["identity", "Identity", "Passport and identification"],
  ["supporting", "Supporting", "CV, SOP, references and experience"],
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function moneySize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DashboardClient({ user, signOutPath }: { user: { name: string; email: string }; signOutPath: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<StudentProfile>(demoProfile);
  const [matches, setMatches] = useState<ScholarshipMatch[]>(() => rankScholarships(demoProfile));
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("Complete your profile, then run a fresh match.");
  const [busy, setBusy] = useState(false);
  const [consultantSent, setConsultantSent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/documents").then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.documents) setDocuments(data.documents);
    }).catch(() => undefined);
  }, []);

  const completeness = useMemo(() => {
    const fields = [profile.studyLevel, profile.field, profile.gpa, profile.englishScore, profile.intake];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!(data.get("file") instanceof File) || !(data.get("file") as File).size) return;
    setBusy(true);
    const response = await fetch("/api/documents", { method: "POST", body: data });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setNotice(payload.error ?? "Upload failed");
    setDocuments((current) => [payload.document, ...current]);
    setNotice(`${payload.document.filename} is stored securely and ready for review.`);
    form.reset();
  }

  async function runMatch() {
    setBusy(true);
    const response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, consentToAiDocumentReview: consent }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setNotice(payload.error ?? "Profile analysis failed");
    setProfile(payload.profile);
    setMatches(payload.results);
    setNotice(payload.notice);
    setTab("matches");
  }

  async function requestConsultant() {
    setBusy(true);
    const response = await fetch("/api/consultant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Please review my current Top Five shortlist and advise the next application steps." }),
    });
    setBusy(false);
    if (response.ok) { setConsultantSent(true); setNotice("Consultant review request recorded."); }
  }

  const navItems: Array<[Tab, string, string]> = [
    ["overview", "⌂", "Overview"], ["documents", "▤", "Documents"], ["profile", "✦", "AI profile"],
    ["matches", "★", "Top Five"], ["applications", "◎", "Applications"], ["consultant", "◫", "Consultant"],
  ];

  return (
    <main className="dashboard-shell">
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <a className="brand dashboard-brand" href="/"><span className="brand-seal">EG</span><span><strong>EG Scholarships</strong><small>Student workspace</small></span></a>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
        <p className="nav-label">MY WORKSPACE</p>
        <nav>{navItems.map(([id, icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setSidebarOpen(false); }}><span>{icon}</span>{label}{id === "matches" && <i>5</i>}{id === "documents" && documents.length > 0 && <i>{documents.length}</i>}</button>)}</nav>
        <div className="sidebar-progress"><div><span>Profile readiness</span><b>{completeness}%</b></div><div className="progress-track"><i style={{ width: `${completeness}%` }} /></div><small>{completeness === 100 ? "Ready for matching" : "Complete the remaining profile fields"}</small></div>
        <div className="sidebar-help"><span>?</span><div><b>Need help?</b><small>Talk to an EG consultant</small></div><button onClick={() => setTab("consultant")}>→</button></div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div><small>EG SCHOLARSHIPS BD</small><strong>{tab === "matches" ? "Your Top Five" : tab[0].toUpperCase() + tab.slice(1)}</strong></div>
          <div className="top-actions"><button title="Notifications">◌<i /></button><div className="user-chip"><span>{initials(user.name)}</span><div><b>{user.name}</b><small>{user.email}</small></div></div><a href={signOutPath}>Sign out</a></div>
        </header>

        <div className="dashboard-body">
          <div className="page-heading"><div><span className="eyebrow">{tab === "overview" ? "GOOD TO SEE YOU" : "STUDENT WORKSPACE"}</span><h1>{tab === "overview" ? `Your next step is clear, ${user.name.split(" ")[0]}.` : navItems.find(([id]) => id === tab)?.[2]}</h1><p>{tab === "overview" ? "Keep your evidence complete, review your Top Five, then move forward with your consultant." : notice}</p></div>{tab === "overview" && <button className="button primary compact" onClick={() => setTab("profile")}>Refresh my matches <span>→</span></button>}</div>

          {tab === "overview" && <Overview documents={documents} matches={matches} completeness={completeness} onNavigate={setTab} />}
          {tab === "documents" && <Documents documents={documents} busy={busy} notice={notice} onUpload={uploadDocument} />}
          {tab === "profile" && <Profile profile={profile} setProfile={setProfile} consent={consent} setConsent={setConsent} documents={documents.length} busy={busy} onRun={runMatch} />}
          {tab === "matches" && <Matches matches={matches} notice={notice} onConsultant={() => setTab("consultant")} />}
          {tab === "applications" && <Applications matches={matches} />}
          {tab === "consultant" && <Consultant sent={consultantSent} busy={busy} onRequest={requestConsultant} />}
        </div>
      </section>
    </main>
  );
}

function Overview({ documents, matches, completeness, onNavigate }: { documents: DocumentItem[]; matches: ScholarshipMatch[]; completeness: number; onNavigate: (tab: Tab) => void }) {
  const best = matches[0];
  return <>
    <div className="metric-grid"><article><span className="metric-icon teal">▤</span><div><small>DOCUMENTS</small><strong>{documents.length || 0} uploaded</strong><p>{documents.length ? "Private student storage" : "Add your first document"}</p></div><button onClick={() => onNavigate("documents")}>→</button></article><article><span className="metric-icon gold">★</span><div><small>TOP FIVE</small><strong>{matches.length} options</strong><p>Profile-led shortlist</p></div><button onClick={() => onNavigate("matches")}>→</button></article><article><span className="metric-icon blue">◔</span><div><small>PROFILE</small><strong>{completeness}% ready</strong><p>Core matching fields</p></div><button onClick={() => onNavigate("profile")}>→</button></article></div>
    <div className="dashboard-two-col">
      <section className="panel featured-match"><div className="panel-head"><div><span className="section-kicker">BEST CURRENT FIT</span><h2>{best?.scholarship.name}</h2></div><span className="score-ring"><b>{best?.score}</b><small>/100</small></span></div><div className="match-meta"><span>{best?.scholarship.country}</span><span>{best?.scholarship.studyLevel}</span><span>{best?.scholarship.coverage}</span></div><p>{best?.rationale}</p><div className="evidence-row"><span>✓ Bangladesh relevance documented</span><span>✓ Official source retained</span></div><button className="text-button" onClick={() => onNavigate("matches")}>Review all five options →</button></section>
      <section className="panel next-steps"><div className="panel-head"><div><span className="section-kicker">NEXT STEPS</span><h2>Keep the file moving.</h2></div><span>2 of 4</span></div>{[["done","Profile essentials","Study level, field and intake added"],[documents.length ? "done" : "current","Upload supporting evidence",documents.length ? `${documents.length} files stored` : "Academic and English documents first"],["current","Review Top Five","Confirm priorities and gaps"],["","Consultant handoff","Submit shortlist for professional review"]].map(([state,title,text],index)=><div className={`step-row ${state}`} key={title}><b>{state === "done" ? "✓" : index+1}</b><div><strong>{title}</strong><small>{text}</small></div></div>)}</section>
    </div>
    <section className="panel catalogue-strip"><div><span className="section-kicker">CURATED DATABASE</span><h2>{scholarships.length} scholarship and funding records</h2><p>Two supplied research workbooks consolidated with source links, verification dates and annual-cycle notes.</p></div><div className="catalogue-stats"><span><b>{new Set(scholarships.map((item)=>item.country)).size}</b> destinations</span><span><b>{scholarships.filter((item)=>/high/i.test(item.confidence)).length}</b> high-confidence records</span><span><b>{scholarships.filter((item)=>/open|rolling|automatic/i.test(item.status)).length}</b> actionable cycles</span></div></section>
  </>;
}

function Documents({ documents, busy, notice, onUpload }: { documents: DocumentItem[]; busy: boolean; notice: string; onUpload: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="dashboard-two-col documents-layout"><section className="panel"><div className="panel-head"><div><span className="section-kicker">PRIVATE STORAGE</span><h2>Upload a student document</h2></div></div><form className="upload-form" onSubmit={onUpload}><label>Document category<select name="category" defaultValue="academic">{categories.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="drop-zone"><span>⇧</span><strong>Choose PDF, DOC, DOCX, JPG or PNG</strong><small>Maximum 10 MB per file</small><input type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" required /></label><button className="button primary" disabled={busy}>{busy ? "Uploading…" : "Store document securely"}</button><p className="form-notice">{notice}</p></form></section><section className="panel"><div className="panel-head"><div><span className="section-kicker">YOUR FILES</span><h2>{documents.length} documents stored</h2></div></div><div className="document-list">{documents.length ? documents.map((doc)=><article key={doc.id}><span>PDF</span><div><strong>{doc.filename}</strong><small>{doc.category} · {moneySize(doc.sizeBytes)}</small></div><i>{doc.status}</i></article>) : <div className="empty-state"><b>▤</b><strong>No documents yet</strong><p>Start with transcripts and your English-test report.</p></div>}</div></section></div>;
}

function Profile({ profile, setProfile, consent, setConsent, documents, busy, onRun }: { profile: StudentProfile; setProfile:(profile:StudentProfile)=>void; consent:boolean; setConsent:(value:boolean)=>void; documents:number; busy:boolean; onRun:()=>void }) {
  const update=(key:keyof StudentProfile,value:string|string[])=>setProfile({...profile,[key]:value});
  return <section className="panel profile-panel"><div className="profile-intro"><div><span className="section-kicker">PROFILE SIGNALS</span><h2>Tell the matching engine what matters.</h2><p>Entered values and document-supported facts stay separate. You can review extracted information before acting.</p></div><span className="ai-badge">✦ Evidence-aware matching</span></div><div className="profile-grid"><label>Study level<select value={profile.studyLevel ?? ""} onChange={(e)=>update("studyLevel",e.target.value)}><option value="">Select</option><option>Bachelor</option><option>Master</option><option>Doctoral</option></select></label><label>Target intake<input value={profile.intake ?? ""} onChange={(e)=>update("intake",e.target.value)} placeholder="e.g. September 2027" /></label><label>Subject / field<input value={profile.field ?? ""} onChange={(e)=>update("field",e.target.value)} placeholder="e.g. Data Science" /></label><label>Preferred countries<input value={profile.preferredCountries?.join(", ") ?? ""} onChange={(e)=>update("preferredCountries",e.target.value.split(",").map((item)=>item.trim()).filter(Boolean))} placeholder="UK, Germany, Finland" /></label><label>GPA / result<input value={profile.gpa ?? ""} onChange={(e)=>update("gpa",e.target.value)} /></label><label>English test<select value={profile.englishTest ?? ""} onChange={(e)=>update("englishTest",e.target.value)}><option value="">Not yet</option><option>IELTS</option><option>TOEFL</option><option>PTE</option><option>Duolingo</option></select></label><label>English score<input value={profile.englishScore ?? ""} onChange={(e)=>update("englishScore",e.target.value)} /></label><label>Available budget<input value={profile.budget ?? ""} onChange={(e)=>update("budget",e.target.value)} placeholder="BDT or range" /></label><label className="wide">Work experience / notes<textarea value={`${profile.workExperience ?? ""}${profile.notes ? `\n${profile.notes}` : ""}`} onChange={(e)=>update("notes",e.target.value)} /></label></div><label className={`consent-card ${consent ? "checked" : ""}`}><input type="checkbox" checked={consent} onChange={(e)=>setConsent(e.target.checked)} /><span>✓</span><div><strong>Use my uploaded documents for this analysis</strong><p>I understand that up to six recent documents may be sent securely to the configured AI provider to extract profile facts. Do not include unnecessary account numbers or unrelated sensitive records.</p><small>{documents} document{documents === 1 ? "" : "s"} currently available</small></div></label><button className="button primary match-button" onClick={onRun} disabled={busy}>{busy ? "Analyzing profile…" : "Generate my Top Five"}<span>✦</span></button></section>;
}

function Matches({ matches, notice, onConsultant }: { matches: ScholarshipMatch[]; notice: string; onConsultant:()=>void }) {
  return <><div className="match-notice"><span>i</span><p>{notice} Match labels support decisions and do not guarantee admission, scholarships or visas.</p></div><div className="matches-list">{matches.map((match,index)=><article className="match-card" key={match.scholarship.id}><div className="rank-block"><span>#{index+1}</span><div className="score-ring small"><b>{match.score}</b><small>/100</small></div></div><div className="match-details"><span className={`match-label ${match.label === "Strong match" ? "strong" : ""}`}>{match.label}</span><h2>{match.scholarship.name}</h2><p className="provider">{match.scholarship.provider} · {match.scholarship.country}</p><div className="match-meta"><span>{match.scholarship.studyLevel}</span><span>{match.scholarship.coverage || "Funding varies"}</span><span>{match.scholarship.status}</span></div><p>{match.rationale}</p>{match.gaps.length > 0 && <div className="gap-row"><b>Check:</b>{match.gaps.map((gap)=><span key={gap}>{gap}</span>)}</div>}</div><div className="match-side"><strong>{match.scholarship.deadline || "Annual cycle"}</strong><small>deadline / cycle</small><a href={match.scholarship.officialSource} target="_blank" rel="noreferrer">Official source ↗</a></div></article>)}</div><div className="consultant-cta"><div><span className="section-kicker">READY FOR A HUMAN CHECK?</span><h2>Send this shortlist to an EG consultant.</h2><p>Your consultant can review requirements, costs, document gaps and application timing.</p></div><button className="button primary" onClick={onConsultant}>Request consultant review →</button></div></>;
}

function Applications({ matches }: { matches: ScholarshipMatch[] }) {
  return <section className="panel"><div className="panel-head"><div><span className="section-kicker">APPLICATION TRACKER</span><h2>Move each option through a clear workflow.</h2></div></div><div className="application-table"><div className="table-row table-head"><span>Option</span><span>Stage</span><span>Next action</span><span>Deadline</span></div>{matches.slice(0,3).map((match,index)=><div className="table-row" key={match.scholarship.id}><span><b>{match.scholarship.name}</b><small>{match.scholarship.country}</small></span><span><i className={index===0 ? "green" : "amber"}>{index===0 ? "Shortlisted" : "Research"}</i></span><span>{index===0 ? "Consultant eligibility review" : "Confirm programme fit"}</span><span>{match.scholarship.deadline || "Monitor cycle"}</span></div>)}</div></section>;
}

function Consultant({ sent, busy, onRequest }: { sent:boolean; busy:boolean; onRequest:()=>void }) {
  return <div className="dashboard-two-col"><section className="panel consultant-panel"><span className="consultant-avatar">EG</span><span className="section-kicker">EXCELLENCE GLOBAL CONSULTANCY</span><h2>Turn your shortlist into an application plan.</h2><p>A consultant review checks the profile evidence, current official requirements, budget fit, deadlines and application sequencing.</p><ul><li>Top Five eligibility and risk review</li><li>Document gap checklist</li><li>Safe, Match and Ambitious balance</li><li>Next-step consultation plan</li></ul><button className="button primary" disabled={busy || sent} onClick={onRequest}>{sent ? "Review requested ✓" : busy ? "Sending…" : "Request consultant review"}</button></section><section className="panel contact-card"><span className="section-kicker">CONTACT</span><h2>EG Consultancy, Dhaka</h2><p>House 22, Road 1, Block Ta, Pallabi, Mirpur, Dhaka 1216, Bangladesh</p><a href="tel:+8801928207111">+880 1928-207111</a><a href="https://wa.me/8801601247111">WhatsApp +880 1601-247111</a><a href="mailto:ceo.egconsulting@gmail.com">ceo.egconsulting@gmail.com</a><small>Consultants verify live requirements before advising. No admission, scholarship or visa outcome is guaranteed.</small></section></div>;
}
