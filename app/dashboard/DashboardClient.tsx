"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import { catalogueCountries, catalogueIntakes, profileCompleteness, scholarships, verificationAgeDays, type CountryCoverageNotice, type ScholarshipMatch, type StudentProfile } from "../lib/matching";
import { buildCostPlan, buildFitChecks } from "../lib/scholarship-analysis";

type Tab = "overview" | "account" | "documents" | "profile" | "matches" | "applications" | "consultant";
type DocumentItem = { id: string; category: string; filename: string; mimeType?: string; sizeBytes: number; status: string; createdAt?: string };
type ApplicationWorkflow = {
  applicationSubmitted?: boolean;
  admissionOfferReceived?: boolean;
  visaApplicationSubmitted?: boolean;
  visaDecisionReceived?: boolean;
  tuitionPaid?: string;
  outstandingFees?: string;
  flightBooked?: boolean;
  flightDetails?: string;
  insuranceArranged?: boolean;
  insuranceFee?: string;
  accommodationArranged?: boolean;
  accommodationDetails?: string;
  applicationGuidelineUrl?: string;
  applicationGuidelineCheck?: string;
  visaGuidelineUrl?: string;
  visaGuidelineCheck?: string;
  notes?: string;
};
type GuidelineResult = {
  sourceUrl: string;
  sourceLabel?: string;
  checkedAt?: string;
  liveCheck?: string;
  mode?: "live-official-ai" | "official-baseline";
  phase: "application" | "visa";
  summary: string;
  requirements: Array<{ requirement: string; status: "matched" | "missing" | "review"; matchedDocuments: string[]; note: string }>;
  warnings: string[];
  disclaimer: string;
};
type CourseResult = {
  summary: string;
  courses: Array<{ name: string; level: string; university: string; url: string; why: string }>;
  officialSource: string;
  disclaimer: string;
  providerWarning?: string;
  mode?: "live-grounded-ai" | "official-catalogue";
};
type ApplicationItem = { scholarshipId: string; stage: string; nextAction: string; workflow?: ApplicationWorkflow; updatedAt?: string };
type ProgressItem = { stage: string; note: string; createdAt: string };
type ReportDelivery = {
  id: string;
  status: "ready" | "sent" | "failed";
  recipientEmail: string;
  createdAt: string;
  sentAt?: string | null;
  downloadUrl: string;
  emailConfigured: boolean;
  message: string;
};
type AccountProfile = {
  fullName: string;
  address: string;
  mobile: string;
  dateOfBirth: string;
  nationality: string;
  currentInstitution: string;
  hasPhoto: boolean;
  photoVersion: number;
  onboardingComplete: boolean;
};

const emptyProfile: StudentProfile = {
  studyLevel: "", preferredCountries: [], field: "", gpa: "",
  secondaryQualification: "", secondaryBoard: "", secondaryYear: "", secondaryResult: "",
  higherSecondaryQualification: "", higherSecondaryBoard: "", higherSecondaryYear: "", higherSecondaryResult: "",
  hasBachelorDegree: "", bachelorDegree: "", bachelorInstitution: "", bachelorSubject: "", bachelorCgpa: "", bachelorCgpaScale: "4", bachelorGraduationYear: "", wantsBachelorAbroad: "",
  englishTest: "", englishScore: "", budget: "", budgetCurrency: "BDT", fundingNeed: "", studyMode: "", intake: "",
  workExperience: "", researchExperience: "", extracurriculars: "", careerGoals: "", notes: "",
};
const categories = [
  ["academic", "Academic", "Transcripts, certificates and mark sheets", "01"],
  ["language", "Language", "IELTS, TOEFL, PTE or Duolingo", "02"],
  ["financial", "Financial", "Bank and sponsor evidence", "03"],
  ["identity", "Identity", "Passport and identification", "04"],
  ["supporting", "Supporting", "CV, SOP, references and experience", "05"],
  ["correspondence", "Emails & letters", "Admission, scholarship and visa correspondence", "06"],
  ["receipts", "Receipts", "Application, tuition, visa and travel payments", "07"],
  ["travel", "Visa & travel", "CAS/COE, insurance, health and bookings", "08"],
];

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function fileSize(bytes: number) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function friendlyCategory(value: string) { return categories.find(([id]) => id === value)?.[1] ?? value; }

export default function DashboardClient({ user, signOutPath, initialTab = "overview" }: { user: { name: string; email: string }; signOutPath: string; initialTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab as Tab);
  const [account, setAccount] = useState<AccountProfile>({ fullName: user.name, address: "", mobile: "", dateOfBirth: "", nationality: "Bangladesh", currentInstitution: "", hasPhoto: false, photoVersion: 0, onboardingComplete: false });
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [matches, setMatches] = useState<ScholarshipMatch[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("Start with your study profile. Documents are optional, and your information saves to this account.");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [consultantSent, setConsultantSent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const [report, setReport] = useState<ReportDelivery | null>(null);
  const [emailReport, setEmailReport] = useState(true);
  const [followUpConsent, setFollowUpConsent] = useState(false);
  const [countryNotices, setCountryNotices] = useState<CountryCoverageNotice[]>([]);
  const localReadingSupported = useSyncExternalStore(
    () => () => undefined,
    () => "showOpenFilePicker" in window,
    () => false,
  );

  async function readJson(response: Response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback = response.status === 413
        ? "This file was too large for a single request. Please retry with the secure uploader."
        : "The request could not be completed";
      throw new Error(payload.error ?? fallback);
    }
    return payload;
  }

  useEffect(() => {
    Promise.all([fetch("/api/workspace").then(readJson), fetch("/api/documents").then(readJson)])
      .then(([workspace, documentData]) => {
        setAccount(workspace.account ?? { fullName: user.name, address: "", mobile: "", dateOfBirth: "", nationality: "Bangladesh", currentInstitution: "", hasPhoto: false, photoVersion: 0, onboardingComplete: false });
        setProfile({ ...emptyProfile, ...(workspace.profile ?? {}) });
        setMatches(workspace.matches ?? []);
        setCountryNotices(workspace.countryNotices ?? []);
        setApplications(workspace.applications ?? []);
        setProgress(workspace.progress ?? []);
        setAiConfigured(Boolean(workspace.aiConfigured));
        setReport(workspace.report ?? null);
        setDocuments(documentData.documents ?? []);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Workspace could not be loaded"))
      .finally(() => setLoading(false));
  }, [user.name]);

  const completeness = useMemo(() => profileCompleteness(profile), [profile]);
  const categoryCount = useMemo(() => new Set(documents.map((doc) => doc.category)).size, [documents]);
  const visibleApplications = useMemo(() => applications.filter((application) => matches.some((match) => match.scholarship.id === application.scholarshipId)), [applications, matches]);

  function navigateTo(next: Tab) {
    setTab(next);
    setSidebarOpen(false);
    router.push(`/dashboard?tab=${next}`);
  }

  async function uploadDocument(data: FormData) {
    setBusy(true);
    let uploadId = "";
    try {
      const file = data.get("file");
      if (!(file instanceof File)) throw new Error("Choose a document to upload");
      const category = String(data.get("category") ?? "other");
      const started = await readJson(await fetch("/api/document-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, filename: file.name, mimeType: file.type, sizeBytes: file.size }),
      }));
      uploadId = started.uploadId;
      for (let index = 0; index < started.totalChunks; index += 1) {
        const from = index * started.chunkSize;
        const chunk = file.slice(from, Math.min(from + started.chunkSize, file.size));
        await readJson(await fetch(`/api/document-uploads/chunk?uploadId=${encodeURIComponent(uploadId)}&index=${index}`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk,
        }));
        setNotice(`Uploading ${file.name} securely — ${Math.round(((index + 1) / started.totalChunks) * 100)}%`);
      }
      const payload = await readJson(await fetch("/api/document-uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      }));
      uploadId = "";
      setDocuments((current) => [payload.document, ...current]);
      setNotice(`${payload.document.filename} uploaded securely. It is ready for profile analysis.`);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed");
      if (uploadId) {
        void fetch(`/api/document-uploads?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" });
      }
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

  async function saveAccount(data: FormData) {
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/account", { method: "PUT", body: data }));
      setAccount(payload.account);
      setNotice("Account information saved.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Account information could not be saved");
      return false;
    } finally { setBusy(false); }
  }

  async function runMatch() {
    setBusy(true);
    setAnalysisProgress("");
    try {
      let localExtraction = null;
      if (consent && documents.length) {
        setAnalysisProgress("Preparing on-device document reading");
        const { analyzeDocumentsOnDevice } = await import("../lib/local-document-analysis");
        localExtraction = await analyzeDocumentsOnDevice(documents, setAnalysisProgress);
      }
      const payload = await readJson(await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, localExtraction, emailReport, followUpConsent }) }));
      setProfile({ ...emptyProfile, ...payload.profile });
      setMatches(payload.results ?? []);
      setCountryNotices(payload.countryNotices ?? []);
      setReport(payload.report ?? null);
      if (payload.analyzedIds?.length) {
        const reviewed = new Set<string>(payload.analyzedIds);
        setDocuments((current) => current.map((document) => reviewed.has(document.id) ? { ...document, status: "analyzed" } : document));
      }
      setNotice(payload.notice);
      navigateTo("matches");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Profile analysis failed"); }
    finally { setBusy(false); setAnalysisProgress(""); }
  }

  async function updateApplication(scholarshipId: string, stage: string, workflow?: ApplicationWorkflow) {
    const actions: Record<string, string> = {
      shortlisted: "Review eligibility and the live deadline",
      application: "Complete and submit the scholarship application",
      admission: "Review the admission offer and award terms",
      visa: "Complete visa, biometrics and health requirements",
      predeparture: "Finalize fees, insurance, flight and accommodation",
      arrived: "Complete enrolment and arrival formalities",
    };
    try {
      const payload = await readJson(await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scholarshipId, stage, nextAction: actions[stage], workflow }) }));
      setApplications((current) => [payload.application, ...current.filter((item) => item.scholarshipId !== scholarshipId)]);
      setNotice("Application plan saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Application could not be updated"); }
  }

  async function requestConsultant() {
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/consultant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Please review my current Best Finds shortlist and advise the next application steps." }) }));
      setConsultantSent(true);
      setNotice(payload.message);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request could not be sent"); }
    finally { setBusy(false); }
  }

  async function retryReportEmail() {
    if (!report) return;
    setBusy(true);
    try {
      const payload = await readJson(await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id }) }));
      setReport(payload);
      setNotice(payload.message);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Report email could not be retried"); }
    finally { setBusy(false); }
  }

  const navItems: Array<[Tab, string, string]> = [["overview", "01", "Overview"], ["account", "02", "My account"], ["profile", "03", "Study profile"], ["documents", "04", "Documents · optional"], ["matches", "05", "Best Finds"], ["applications", "06", "Applications"], ["consultant", "07", "Consultant"]];
  const pageDescriptions: Record<Tab, string> = {
    overview: "Your profile, tailored opportunities and application progress in one place.",
    account: "Keep the contact details linked to your secure student workspace current.",
    profile: "Build the academic, destination and funding picture used for your ranking.",
    documents: "Store application records securely; uploads remain optional for matching.",
    matches: "Compare ten ranked options, their evidence, gaps and practical next steps.",
    applications: "Track shortlisted awards from application through visa and arrival.",
    consultant: "Request a human review of eligibility, evidence, budget and deadlines.",
  };
  if (loading) return <main className="workspace-loading"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><strong>Preparing your secure workspace</strong><i /></main>;
  if (!account.onboardingComplete) return <AccountSetup account={account} email={user.email} busy={busy} notice={notice} onSave={saveAccount} signOutPath={signOutPath} />;

  return <main className="dashboard-shell">
    <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
      <Link className="brand dashboard-brand" href="/"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>Student workspace</small></span></Link>
      <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
      <p className="nav-label">YOUR JOURNEY</p>
      <nav>{navItems.map(([id, icon, label]) => <Link key={id} href={`/dashboard?tab=${id}`} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setSidebarOpen(false); }}><span>{icon}</span>{label}{id === "matches" && matches.length > 0 && <i>{matches.length}</i>}{id === "documents" && documents.length > 0 && <i>{documents.length}</i>}</Link>)}</nav>
      <div className="sidebar-progress"><div><span>Profile readiness</span><b>{completeness}%</b></div><div className="progress-track"><i style={{ width: `${completeness}%` }} /></div><small>{completeness >= 80 ? "Ready for a meaningful match" : "Complete core profile fields"}</small></div>
      <div className="sidebar-help"><span>?</span><div><b>Need a second opinion?</b><small>Ask an EG consultant</small></div><Link href="/dashboard?tab=consultant" aria-label="Open consultant section">→</Link></div>
    </aside>

    <section className="dashboard-content">
      <header className="dashboard-topbar"><button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button><div><small>EG SCHOLARSHIPS BD</small><strong>{navItems.find(([id]) => id === tab)?.[2]}</strong></div><div className="top-actions"><div className="secure-pill"><span /> Secure workspace</div><ThemeToggle compact /><button className="user-chip" onClick={() => navigateTo("account")} aria-label="Edit my account">{account.hasPhoto ? <img src={`/api/account/photo?v=${account.photoVersion}`} alt="" /> : <span>{initials(account.fullName)}</span>}<div><b>{account.fullName}</b><small>{user.email}</small></div></button><a href={signOutPath}>Sign out</a></div></header>
      <div className="dashboard-body">
        <div className="page-heading"><div><span className="eyebrow">{tab === "overview" ? "YOUR ACTION CENTRE" : "STUDENT WORKSPACE"}</span><h1>{tab === "overview" ? `Welcome back, ${account.fullName.split(" ")[0]}.` : navItems.find(([id]) => id === tab)?.[2]}</h1><p>{pageDescriptions[tab]}</p></div>{tab === "overview" && <button className="button primary compact" onClick={() => navigateTo(completeness < 80 ? "profile" : "matches")}>{completeness < 80 ? "Complete my profile" : "Browse Best Finds"}<span>→</span></button>}</div>
        {tab === "overview" && <Overview documents={documents} matches={matches} completeness={completeness} categoryCount={categoryCount} applications={visibleApplications} progress={progress} onNavigate={navigateTo} />}
        {tab === "account" && <AccountEditor account={account} email={user.email} busy={busy} notice={notice} onSave={saveAccount} />}
        {tab === "documents" && <Documents documents={documents} busy={busy} deletingId={deletingId} notice={notice} onUpload={uploadDocument} onDelete={removeDocument} />}
        {tab === "profile" && <Profile profile={profile} setProfile={setProfile} consent={consent} setConsent={setConsent} emailReport={emailReport} setEmailReport={setEmailReport} followUpConsent={followUpConsent} setFollowUpConsent={setFollowUpConsent} email={user.email} documents={documents.length} busy={busy} analysisProgress={analysisProgress} aiConfigured={aiConfigured} localReadingSupported={localReadingSupported} onSave={saveProfile} onRun={runMatch} />}
        {tab === "matches" && <Matches matches={matches} countryNotices={countryNotices} profile={profile} report={report} busy={busy} notice={notice} onRetryReport={retryReportEmail} onProfile={() => navigateTo("profile")} onConsultant={() => navigateTo("consultant")} onTrack={(id) => { updateApplication(id, "shortlisted"); navigateTo("applications"); }} />}
        {tab === "applications" && <Applications matches={matches} applications={visibleApplications} recordCount={documents.length} onUpdate={updateApplication} />}
        {tab === "consultant" && <Consultant sent={consultantSent} busy={busy} email={user.email} onRequest={requestConsultant} />}
      </div>
    </section>
  </main>;
}

function AccountSetup({ account, email, busy, notice, onSave, signOutPath }: { account: AccountProfile; email: string; busy: boolean; notice: string; onSave: (data: FormData) => Promise<boolean>; signOutPath: string }) {
  return <main className="onboarding-shell">
    <header className="onboarding-header"><Link className="brand" href="/"><img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" /><span><strong>EG Scholarships</strong><small>Student account setup</small></span></Link><a href={signOutPath}>Sign out</a></header>
    <section className="onboarding-card">
      <div className="onboarding-intro"><span className="section-kicker">WELCOME TO YOUR WORKSPACE</span><h1>Let’s set up your student account.</h1><p>These details help EG Consultancy identify your profile and deliver your personal scholarship report. Only your name, address and Bangladesh mobile number are required.</p><ol><li className="active"><b>1</b><span><strong>Account details</strong><small>Tell us who you are</small></span></li><li><b>2</b><span><strong>Study profile</strong><small>Add academic preferences</small></span></li><li><b>3</b><span><strong>Best 10 + report</strong><small>Review your strongest options</small></span></li></ol></div>
      <div className="onboarding-form-wrap"><AccountForm account={account} email={email} busy={busy} notice={notice} onSave={onSave} submitLabel="Create my student account" /></div>
    </section>
    <p className="onboarding-foot">Your account information is private to your signed-in workspace and EG Consultancy support workflow.</p>
  </main>;
}

function AccountEditor({ account, email, busy, notice, onSave }: { account: AccountProfile; email: string; busy: boolean; notice: string; onSave: (data: FormData) => Promise<boolean> }) {
  return <section className="panel account-panel"><div className="profile-intro"><div><span className="section-kicker">ACCOUNT INFORMATION</span><h2>Keep your student details current.</h2><p>Edit your contact information or replace your profile photo at any time. Your sign-in email remains read-only.</p></div><span className="privacy-chip">Private to your account</span></div><AccountForm account={account} email={email} busy={busy} notice={notice} onSave={onSave} submitLabel="Save account changes" /></section>;
}

function AccountForm({ account, email, busy, notice, onSave, submitLabel }: { account: AccountProfile; email: string; busy: boolean; notice: string; onSave: (data: FormData) => Promise<boolean>; submitLabel: string }) {
  const [draft, setDraft] = useState(account);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function update(key: keyof AccountProfile, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData();
    data.set("fullName", draft.fullName);
    data.set("address", draft.address);
    data.set("mobile", draft.mobile);
    data.set("dateOfBirth", draft.dateOfBirth);
    data.set("nationality", draft.nationality);
    data.set("currentInstitution", draft.currentInstitution);
    if (photo) data.set("photo", photo);
    if (await onSave(data)) {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(null);
      setPhotoPreview(null);
    }
  }

  function choosePhoto(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  const photoSource = photoPreview ?? (account.hasPhoto ? `/api/account/photo?v=${account.photoVersion}` : null);
  return <form className="account-form" onSubmit={submit}>
    <div className="account-photo-field"><div className="account-avatar">{photoSource ? <img src={photoSource} alt="Profile preview" /> : <span>{initials(draft.fullName || email)}</span>}</div><div><strong>Profile photo</strong><p>Optional · JPG, PNG or WebP · maximum 5 MB</p><label className="photo-picker" htmlFor="account-photo">{photo ? "Choose a different photo" : account.hasPhoto ? "Replace photo" : "Upload a photo"}<input id="account-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)} /></label>{photo && <small>{photo.name} selected</small>}</div></div>
    <div className="account-fields">
      <label htmlFor="account-full-name"><span>Full name <b>*</b></span><input id="account-full-name" name="fullName" value={draft.fullName} onChange={(event) => update("fullName", event.target.value)} autoComplete="name" required maxLength={120} placeholder="Student's full name" /></label>
      <label htmlFor="account-email">Sign-in email<input id="account-email" name="email" value={email} readOnly aria-readonly="true" /></label>
      <label className="wide" htmlFor="account-address"><span>Present address <b>*</b></span><textarea id="account-address" name="address" value={draft.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" required maxLength={300} placeholder="House, road, area, city and postcode" /></label>
      <label htmlFor="account-mobile"><span>Bangladesh mobile number <b>*</b></span><input id="account-mobile" name="mobile" value={draft.mobile} onChange={(event) => update("mobile", event.target.value)} autoComplete="tel" inputMode="tel" required maxLength={30} placeholder="01712-345678" /></label>
      <label htmlFor="account-dob">Date of birth <small>Optional</small><input id="account-dob" name="dateOfBirth" type="date" value={draft.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></label>
      <label htmlFor="account-nationality">Nationality <small>Optional</small><input id="account-nationality" name="nationality" value={draft.nationality} onChange={(event) => update("nationality", event.target.value)} maxLength={80} placeholder="Bangladesh" /></label>
      <label htmlFor="account-institution">Current institution <small>Optional</small><input id="account-institution" name="currentInstitution" value={draft.currentInstitution} onChange={(event) => update("currentInstitution", event.target.value)} maxLength={160} placeholder="School, college or university" /></label>
    </div>
    <div className="account-submit"><p className="form-notice" role="status">{notice}</p><button className="button primary" disabled={busy}>{busy ? "Saving securely..." : submitLabel}<span>→</span></button></div>
  </form>;
}

function Overview({ documents, matches, completeness, categoryCount, applications, progress, onNavigate }: { documents: DocumentItem[]; matches: ScholarshipMatch[]; completeness: number; categoryCount: number; applications: ApplicationItem[]; progress: ProgressItem[]; onNavigate: (tab: Tab) => void }) {
  const nextTab: Tab = completeness < 80 ? "profile" : matches.length ? "matches" : "profile";
  const nextTitle = completeness < 80 ? "Complete your study profile" : matches.length ? "Browse your Best Finds" : "Generate your first Best Finds";
  const roadmapDone = [completeness >= 80, matches.length > 0, applications.length > 0].filter(Boolean).length;
  return <>
    <section className="action-hero"><div><span className="section-kicker">RECOMMENDED NEXT ACTION</span><h2>{nextTitle}</h2><p>{completeness < 80 ? "Detailed academic results and study preferences produce more accurate suggestions." : "Your workspace keeps matching, documents, correspondence, receipts and every application stage connected."}</p><button className="button light" onClick={() => onNavigate(nextTab)}>Continue now →</button></div><div className="readiness-dial"><strong>{completeness}%</strong><span>profile ready</span></div></section>
    <div className="metric-grid"><article><span className="metric-icon teal">DOC</span><div><small>STUDENT RECORDS HUB</small><strong>{documents.length} files</strong><p>{documents.length ? `${categoryCount} of ${categories.length} categories organized` : "Documents, emails & receipts together"}</p></div><button onClick={() => onNavigate("documents")}>→</button></article><article><span className="metric-icon gold">BEST</span><div><small>BEST FINDS</small><strong>{matches.length ? `${matches.length} matches` : "Not generated"}</strong><p>{matches.length ? "Profile-led ranking" : "Study profile required first"}</p></div><button onClick={() => onNavigate("matches")}>→</button></article><article><span className="metric-icon blue">APP</span><div><small>APPLICATION TRACKER</small><strong>{applications.length} tracked</strong><p>Admission, visa, fees, travel & arrival</p></div><button onClick={() => onNavigate("applications")}>→</button></article></div>
    <section className="workspace-hub"><div><span className="section-kicker">YOUR ONE-STOP STUDENT WORKSPACE</span><h2>From first search to arrival, keep the whole journey together.</h2><p>Best Finds helps you choose. The records hub keeps every supporting file, email and payment receipt ready. The application tracker remembers what happened and what comes next.</p></div><div className="hub-links"><button onClick={() => onNavigate("profile")}><b>01</b><span><strong>Study profile</strong><small>Academic history & goals</small></span></button><button onClick={() => onNavigate("documents")}><b>02</b><span><strong>Records hub</strong><small>Files, emails & receipts</small></span></button><button onClick={() => onNavigate("matches")}><b>03</b><span><strong>Best Finds</strong><small>Tailored opportunities</small></span></button><button onClick={() => onNavigate("applications")}><b>04</b><span><strong>Application tracker</strong><small>Admission through arrival</small></span></button></div></section>
    <div className="dashboard-two-col"><section className="panel journey-panel"><div className="panel-head"><div><span className="section-kicker">YOUR ROADMAP</span><h2>Progress without guesswork.</h2></div><span>{roadmapDone} / 3 complete</span></div>{[[completeness >= 80, "Study profile", completeness >= 80 ? "Core results and preferences saved" : "Add SSC/O-level, HSC/A-level and study plans", "profile"], [matches.length > 0, "Best Finds generated", matches.length ? `${matches.length} tailored opportunities ready` : "Run profile matching", "matches"], [applications.length > 0, "Application plan", applications.length ? `${applications.length} option${applications.length === 1 ? "" : "s"} tracked` : "Move a Best Find into tracking", "applications"]].map(([done, title, text, destination], index) => <button className={`roadmap-step ${done ? "done" : ""}`} key={String(title)} onClick={() => onNavigate(destination as Tab)}><b>{done ? "✓" : index + 1}</b><span><strong>{title as string}</strong><small>{text as string}</small></span><i>→</i></button>)}<button className="roadmap-step optional-step" onClick={() => onNavigate("documents")}><b>+</b><span><strong>Student records <em>Optional for matching</em></strong><small>{documents.length ? `${documents.length} files safely kept together` : "Recommended for documents, emails and receipts later"}</small></span><i>→</i></button></section>
      <section className="panel activity-panel"><div className="panel-head"><div><span className="section-kicker">RECENT ACTIVITY</span><h2>Your workspace history</h2></div></div>{progress.length ? progress.map((item) => <article key={`${item.stage}-${item.createdAt}`}><span /><div><strong>{item.stage}</strong><small>{item.note}</small></div></article>) : <div className="empty-state compact-empty"><b>◎</b><strong>Your activity will appear here</strong><p>Uploads, matches and consultant updates create a clear audit trail.</p></div>}</section></div>
    <section className="panel catalogue-strip"><div><span className="section-kicker">CURATED DATABASE</span><h2>{scholarships.length} source-backed opportunities</h2><p>Built from the supplied regional research workbooks. Deadlines and eligibility must still be rechecked on official pages before applying.</p></div><div className="catalogue-stats"><span><b>{new Set(scholarships.map((item) => item.country)).size}</b> destinations</span><span><b>{scholarships.filter((item) => /high/i.test(item.confidence)).length}</b> high-confidence</span><span><b>∞</b> no five-result limit</span></div></section>
  </>;
}

function Documents({ documents, busy, deletingId, notice, onUpload, onDelete }: { documents: DocumentItem[]; busy: boolean; deletingId: string | null; notice: string; onUpload: (data: FormData) => Promise<boolean>; onDelete: (id: string, filename: string) => Promise<void> }) {
  const [selected, setSelected] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState("academic");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected) return; const form = event.currentTarget; const data = new FormData(); data.set("category", category); data.set("file", selected); if (await onUpload(data)) { setSelected(null); form.reset(); } }
  return <><section className="document-guide optional-vault"><div><span className="section-kicker">STUDENT RECORDS HUB</span><h2>One place for every important record.</h2><p>You do not need to upload files to receive Best Finds. During applications, however, this private hub helps you keep academic documents, university emails, offer letters, payment receipts, visa evidence and travel records organized and easy to find.</p><span className="optional-badge">Optional for matching · Recommended for organization</span></div><div className="category-cards">{categories.map(([id, label, text, number]) => { const count = documents.filter((doc) => doc.category === id).length; return <article key={id} className={count ? "complete" : ""}><span>{count ? "✓" : number}</span><div><strong>{label}</strong><small>{text}</small></div><b>{count}</b></article>; })}</div></section>
    <section className="vault-purpose-grid"><article><span>01</span><div><strong>Before applying</strong><p>Keep transcripts, tests, CV, SOP, references and passport copies ready.</p></div></article><article><span>02</span><div><strong>During applications</strong><p>Save confirmation emails, offer letters, invoices and every payment receipt.</p></div></article><article><span>03</span><div><strong>Visa to arrival</strong><p>Organize CAS/COE, visa records, insurance, flights, accommodation and enrolment evidence.</p></div></article></section>
    <div className="dashboard-two-col documents-layout"><section className="panel"><div className="panel-head"><div><span className="section-kicker">SECURE UPLOAD</span><h2>Add a document</h2></div><span className="privacy-chip">Private to your account</span></div><form className="upload-form" onSubmit={submit}><label htmlFor="document-category">Document category<select id="document-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className={`drop-zone ${dragging ? "dragging" : ""}`} htmlFor="document-file" onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDrop={() => setDragging(false)}><span>↑</span><strong>{selected ? selected.name : "Drop a file here or choose from your device"}</strong><small>{selected ? `${fileSize(selected.size)} ready to upload` : "PDF, DOC, DOCX, JPG or PNG — up to 20 MB"}</small><input id="document-file" type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setSelected(event.target.files?.[0] ?? null)} required /></label><button className="button primary" disabled={busy || !selected}>{busy ? "Uploading securely..." : selected ? "Upload this document" : "Choose a document first"}</button><p className="form-notice" role="status">{notice}</p></form></section>
      <section className="panel"><div className="panel-head"><div><span className="section-kicker">YOUR FILES</span><h2>{documents.length} document{documents.length === 1 ? "" : "s"} stored</h2></div></div><div className="document-list">{documents.length ? documents.map((doc) => <article key={doc.id}><span>{doc.filename.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span><div><strong>{doc.filename}</strong><small>{friendlyCategory(doc.category)} · {fileSize(doc.sizeBytes)}</small></div><i>{doc.status === "analyzed" ? "On-device reviewed" : "Ready"}</i><div className="document-actions"><a href={`/api/documents/download?id=${encodeURIComponent(doc.id)}`} target="_blank" rel="noreferrer">Open</a><button type="button" onClick={() => onDelete(doc.id, doc.filename)} disabled={deletingId === doc.id}>{deletingId === doc.id ? "Removing..." : "Remove"}</button></div></article>) : <div className="empty-state"><b>↑</b><strong>No documents uploaded—and that’s fine</strong><p>You can generate Best Finds from your study profile alone.</p></div>}</div></section></div></>;
}

function CountryField({ value, onChange }: { value: string[]; onChange: (countries: string[]) => void }) {
  return <label className="wide country-field" htmlFor="preferred-countries">Preferred countries
    <select id="preferred-countries" name="preferredCountries" multiple size={6} value={value} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>
      {catalogueCountries.map((country) => <option key={country} value={country}>{country}</option>)}
    </select>
    <small>Choose one or more destinations from the current scholarship catalogue. Hold Ctrl or Command to select several.</small>
  </label>;
}

function Profile({ profile, setProfile, consent, setConsent, emailReport, setEmailReport, followUpConsent, setFollowUpConsent, email, documents, busy, analysisProgress, aiConfigured, localReadingSupported, onSave, onRun }: { profile: StudentProfile; setProfile: (profile: StudentProfile) => void; consent: boolean; setConsent: (value: boolean) => void; emailReport: boolean; setEmailReport: (value: boolean) => void; followUpConsent: boolean; setFollowUpConsent: (value: boolean) => void; email: string; documents: number; busy: boolean; analysisProgress: string; aiConfigured: boolean; localReadingSupported: boolean; onSave: () => void; onRun: () => void }) {
  const update = (key: keyof StudentProfile, value: string | string[]) => setProfile({ ...profile, [key]: value });
  const bachelorAnswer = (answer: "yes" | "no") => setProfile({
    ...profile,
    hasBachelorDegree: answer,
    wantsBachelorAbroad: answer === "yes" ? "" : profile.wantsBachelorAbroad,
    studyLevel: answer === "yes" && profile.studyLevel === "Bachelor" ? "Master" : profile.studyLevel,
  });
  const wantsBachelor = (answer: "yes" | "no") => setProfile({ ...profile, wantsBachelorAbroad: answer, studyLevel: answer === "yes" ? "Bachelor" : profile.studyLevel });
  return <section className="panel profile-panel expanded-profile">
    <div className="profile-intro"><div><span className="section-kicker">PROFILE BUILDER · STEP 03</span><h2>Build the profile behind better suggestions.</h2><p>Add your academic pathway, destinations, funding and career preferences. Weighted eligibility rules stay authoritative while an optional AI layer improves explanations.</p></div><span className={`ai-badge ${aiConfigured ? "" : "warning"}`}>{aiConfigured ? "AI-assisted ranking, verified against our catalogue" : "Catalogue-verified ranking active"}</span></div>

    <fieldset className="profile-section"><legend>School & college results</legend><p>Use the qualification name that applies to you—Bangladeshi and international pathways are both supported.</p><div className="profile-grid">
      <label htmlFor="secondary-qualification">SSC / O-level qualification<select id="secondary-qualification" name="secondaryQualification" value={profile.secondaryQualification ?? ""} onChange={(e) => update("secondaryQualification", e.target.value)}><option value="">Choose qualification</option><option>SSC</option><option>O-levels</option><option>Equivalent secondary</option></select></label>
      <label htmlFor="secondary-board">Board / awarding body<input id="secondary-board" name="secondaryBoard" value={profile.secondaryBoard ?? ""} onChange={(e) => update("secondaryBoard", e.target.value)} placeholder="Dhaka Board, Cambridge, Edexcel" /></label>
      <label htmlFor="secondary-year">Passing year<input id="secondary-year" name="secondaryYear" inputMode="numeric" value={profile.secondaryYear ?? ""} onChange={(e) => update("secondaryYear", e.target.value)} placeholder="e.g. 2022" /></label>
      <label htmlFor="secondary-result">SSC GPA / O-level grades<input id="secondary-result" name="secondaryResult" value={profile.secondaryResult ?? ""} onChange={(e) => update("secondaryResult", e.target.value)} placeholder="e.g. GPA 5.00 or 5A* 3A" /></label>
      <label htmlFor="higher-secondary-qualification">HSC / A-level qualification<select id="higher-secondary-qualification" name="higherSecondaryQualification" value={profile.higherSecondaryQualification ?? ""} onChange={(e) => update("higherSecondaryQualification", e.target.value)}><option value="">Choose qualification</option><option>HSC</option><option>A-levels</option><option>International Baccalaureate</option><option>Equivalent higher secondary</option></select></label>
      <label htmlFor="higher-secondary-board">Board / awarding body<input id="higher-secondary-board" name="higherSecondaryBoard" value={profile.higherSecondaryBoard ?? ""} onChange={(e) => update("higherSecondaryBoard", e.target.value)} placeholder="Dhaka Board, Cambridge, Edexcel, IB" /></label>
      <label htmlFor="higher-secondary-year">Passing year<input id="higher-secondary-year" name="higherSecondaryYear" inputMode="numeric" value={profile.higherSecondaryYear ?? ""} onChange={(e) => update("higherSecondaryYear", e.target.value)} placeholder="e.g. 2024" /></label>
      <label htmlFor="higher-secondary-result">HSC GPA / A-level / IB result<input id="higher-secondary-result" name="higherSecondaryResult" value={profile.higherSecondaryResult ?? ""} onChange={(e) => update("higherSecondaryResult", e.target.value)} placeholder="e.g. GPA 4.80, AAB or IB 36" /></label>
    </div></fieldset>

    <fieldset className="profile-section bachelor-popover"><legend>Bachelor&apos;s status</legend><div className="degree-question"><div><strong>Have you completed a Bachelor&apos;s degree?</strong><p>Your answer reveals the right fields and target level.</p></div><div className="choice-buttons" role="group" aria-label="Bachelor's degree completed"><button type="button" className={profile.hasBachelorDegree === "yes" ? "selected" : ""} onClick={() => bachelorAnswer("yes")}>Yes, completed</button><button type="button" className={profile.hasBachelorDegree === "no" ? "selected" : ""} onClick={() => bachelorAnswer("no")}>No</button></div></div>
      {profile.hasBachelorDegree === "yes" && <div className="conditional-panel"><div className="conditional-title"><span>✓</span><div><strong>Add your Bachelor&apos;s result</strong><small>We use CGPA and scale together for safer comparisons.</small></div></div><div className="profile-grid"><label htmlFor="bachelor-degree">Degree / qualification<input id="bachelor-degree" name="bachelorDegree" value={profile.bachelorDegree ?? ""} onChange={(e) => update("bachelorDegree", e.target.value)} placeholder="BSc, BBA, BA, BEng" /></label><label htmlFor="bachelor-institution">Institution<input id="bachelor-institution" name="bachelorInstitution" value={profile.bachelorInstitution ?? ""} onChange={(e) => update("bachelorInstitution", e.target.value)} placeholder="University name" /></label><label htmlFor="bachelor-subject">Major / subject<input id="bachelor-subject" name="bachelorSubject" value={profile.bachelorSubject ?? ""} onChange={(e) => update("bachelorSubject", e.target.value)} placeholder="e.g. Clothing & Textile" /></label><label htmlFor="bachelor-year">Graduation year<input id="bachelor-year" name="bachelorGraduationYear" inputMode="numeric" value={profile.bachelorGraduationYear ?? ""} onChange={(e) => update("bachelorGraduationYear", e.target.value)} placeholder="e.g. 2025" /></label><label htmlFor="bachelor-cgpa">Bachelor&apos;s CGPA<input id="bachelor-cgpa" name="bachelorCgpa" inputMode="decimal" value={profile.bachelorCgpa ?? ""} onChange={(e) => update("bachelorCgpa", e.target.value)} placeholder="e.g. 3.56" /></label><label htmlFor="bachelor-scale">CGPA scale<select id="bachelor-scale" name="bachelorCgpaScale" value={profile.bachelorCgpaScale ?? "4"} onChange={(e) => update("bachelorCgpaScale", e.target.value)}><option value="4">Out of 4.00</option><option value="5">Out of 5.00</option><option value="10">Out of 10.00</option><option value="100">Percentage / 100</option></select></label></div></div>}
      {profile.hasBachelorDegree === "no" && <div className="conditional-panel pursue-panel"><div><strong>Do you want to pursue a Bachelor&apos;s abroad?</strong><small>Selecting Yes automatically sets your target level to Bachelor.</small></div><div className="choice-buttons" role="group" aria-label="Wants to pursue a Bachelor's abroad"><button type="button" className={profile.wantsBachelorAbroad === "yes" ? "selected" : ""} onClick={() => wantsBachelor("yes")}>Yes, abroad</button><button type="button" className={profile.wantsBachelorAbroad === "no" ? "selected" : ""} onClick={() => wantsBachelor("no")}>No / exploring</button></div></div>}
    </fieldset>

    <fieldset className="profile-section"><legend>Study plans & funding</legend><div className="profile-grid">
      <label htmlFor="study-level">Target study level<select id="study-level" name="studyLevel" value={profile.studyLevel ?? ""} onChange={(e) => update("studyLevel", e.target.value)}><option value="">Select your target</option><option>Bachelor</option><option>Master</option><option>Doctoral</option></select></label>
      <label htmlFor="target-intake">Target intake<select id="target-intake" name="intake" value={profile.intake ?? ""} onChange={(e) => update("intake", e.target.value)}><option value="">Choose a catalogue intake</option>{profile.intake && !catalogueIntakes.includes(profile.intake) && <option>{profile.intake}</option>}{catalogueIntakes.map((intake) => <option key={intake} value={intake}>{intake}</option>)}</select></label>
      <label htmlFor="subject-field">Subject / field<input id="subject-field" name="field" value={profile.field ?? ""} onChange={(e) => update("field", e.target.value)} placeholder="e.g. Textile" /></label>
      <label htmlFor="study-mode">Study mode<select id="study-mode" name="studyMode" value={profile.studyMode ?? ""} onChange={(e) => update("studyMode", e.target.value)}><option value="">Any suitable mode</option><option>On campus</option><option>Research</option><option>Coursework</option><option>Online / hybrid</option></select></label>
      <CountryField value={profile.preferredCountries ?? []} onChange={(countries) => update("preferredCountries", countries)} />
      <label className="wide" htmlFor="annual-budget">Available annual budget<div className="budget-input"><select id="budget-currency" name="budgetCurrency" aria-label="Budget currency" value={profile.budgetCurrency ?? "BDT"} onChange={(e) => update("budgetCurrency", e.target.value)}><option>BDT</option><option>GBP</option><option>NZD</option><option>EUR</option><option>USD</option></select><input id="annual-budget" name="budget" type="number" min="0" step="1000" inputMode="decimal" value={profile.budget ?? ""} onChange={(e) => update("budget", e.target.value)} placeholder="e.g. 1500000" /></div></label>
      <label htmlFor="funding-needed">Funding needed<select id="funding-needed" name="fundingNeed" value={profile.fundingNeed ?? ""} onChange={(e) => update("fundingNeed", e.target.value)}><option value="">Choose funding preference</option><option>Fully funded only</option><option>Full tuition scholarship</option><option>Partial scholarship / discount</option><option>Any meaningful funding</option><option>Self-funded if affordable</option></select></label>
    </div></fieldset>

    <fieldset className="profile-section"><legend>Eligibility & personal fit</legend><div className="profile-grid">
      <label htmlFor="english-test">English test<select id="english-test" name="englishTest" value={profile.englishTest ?? ""} onChange={(e) => update("englishTest", e.target.value)}><option value="">Choose status</option><option>Not taken yet / planning</option><option>IELTS</option><option>TOEFL</option><option>PTE</option><option>Duolingo</option><option>Medium of Instruction</option></select></label>
      <label htmlFor="english-score">English score<input id="english-score" name="englishScore" value={profile.englishScore ?? ""} onChange={(e) => update("englishScore", e.target.value)} placeholder="e.g. IELTS 6.0" /></label>
      <label htmlFor="work-experience">Work experience<input id="work-experience" name="workExperience" value={profile.workExperience ?? ""} onChange={(e) => update("workExperience", e.target.value)} placeholder="e.g. 2 years in textiles" /></label>
      <label htmlFor="research-experience">Research experience<input id="research-experience" name="researchExperience" value={profile.researchExperience ?? ""} onChange={(e) => update("researchExperience", e.target.value)} placeholder="Projects, thesis, publications" /></label>
      <label className="wide" htmlFor="extracurriculars">Leadership & extracurriculars<textarea id="extracurriculars" name="extracurriculars" value={profile.extracurriculars ?? ""} onChange={(e) => update("extracurriculars", e.target.value)} placeholder="Clubs, volunteering, awards, competitions, leadership" /></label>
      <label className="wide" htmlFor="career-goals">Career goals<textarea id="career-goals" name="careerGoals" value={profile.careerGoals ?? ""} onChange={(e) => update("careerGoals", e.target.value)} placeholder="What do you want to study, achieve and contribute after graduation?" /></label>
      <label className="wide" htmlFor="profile-notes">Priorities or constraints<textarea id="profile-notes" name="notes" value={profile.notes ?? ""} onChange={(e) => update("notes", e.target.value)} placeholder="Funding priority, family needs, location constraints or anything matching should consider" /></label>
    </div></fieldset>

    <div className="ai-explainer"><span>✦</span><div><strong>{aiConfigured ? "AI-assisted ranking, verified against our catalogue" : "Catalogue-verified ranking is active"}</strong><p>Eligibility rules determine scores, score bands and hard gaps. The optional AI layer can tailor explanations but cannot override them. Names, email addresses and raw document text are excluded from that request. The portal returns 10 ranked options.</p></div></div>
    {localReadingSupported && <label className={`consent-card ${consent ? "checked" : ""} ${documents === 0 ? "disabled" : ""}`} htmlFor="local-document-consent"><input id="local-document-consent" name="localDocumentConsent" type="checkbox" checked={consent} disabled={documents === 0 || busy} onChange={(e) => setConsent(e.target.checked)} /><span>✓</span><div><strong>Optionally read my recent documents on this device</strong><p>This is not required for Best Finds. PDF, DOCX, JPG and PNG files are read inside your browser; detected facts only fill blank profile fields.</p><small>{documents} document{documents === 1 ? "" : "s"} available · {documents ? "up to 4 recent files can be reviewed" : "you can continue without documents"}</small>{analysisProgress && <b className="analysis-progress" role="status">{analysisProgress}</b>}</div></label>}
    <section className="report-delivery-choice" aria-labelledby="report-delivery-title"><div className="report-choice-head"><span>PDF</span><div><strong id="report-delivery-title">Your detailed EG Consultancy report</strong><p>Alongside the 10 results shown here, we prepare a branded PDF with your profile summary, match realities, official links and next-step plan.</p></div></div><label htmlFor="email-report"><input id="email-report" name="emailReport" type="checkbox" checked={emailReport} onChange={(event) => setEmailReport(event.target.checked)} disabled={busy} /><span><strong>Email the report to {email}</strong><small>You can also download it securely from Best Finds.</small></span></label><label htmlFor="follow-up-consent"><input id="follow-up-consent" name="followUpConsent" type="checkbox" checked={followUpConsent} onChange={(event) => setFollowUpConsent(event.target.checked)} disabled={busy} /><span><strong>EG Consultancy may contact me about this shortlist</strong><small>Optional. This helps a consultant follow up about an office consultation.</small></span></label></section>
    <div className="profile-actions"><button className="button ghost" onClick={onSave} disabled={busy}>{busy ? "Working..." : "Save profile"}</button><button className="button primary match-button" onClick={onRun} disabled={busy}>{busy ? analysisProgress || "Finding opportunities..." : emailReport ? "Find my top 10 & email report" : "Find my top 10"}<span>✦</span></button></div>
  </section>;
}

const CAMPUS_IMAGES = [
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=82",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=82",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=82",
  "https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&w=800&q=82",
];
function campusImage(provider: string) { return CAMPUS_IMAGES[[...provider].reduce((sum, character) => sum + character.charCodeAt(0), 0) % CAMPUS_IMAGES.length]; }

function Matches({ matches, countryNotices, profile, report, busy, notice, onRetryReport, onProfile, onConsultant, onTrack }: { matches: ScholarshipMatch[]; countryNotices: CountryCoverageNotice[]; profile: StudentProfile; report: ReportDelivery | null; busy: boolean; notice: string; onRetryReport: () => void; onProfile: () => void; onConsultant: () => void; onTrack: (id: string) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const [courseTarget, setCourseTarget] = useState<ScholarshipMatch | null>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.min(390, rail.current.clientWidth * .86), behavior: "smooth" });
  if (!matches.length) return <section className="panel large-empty"><span>✦</span><h2>Your Best Finds start with your study profile.</h2><p>Complete your academic results and preferred destinations. Documents are optional.</p><button className="button primary" onClick={onProfile}>Complete my profile</button></section>;
  return <>{report && <section className={`report-status-card ${report.status}`}><div className="report-status-icon">{report.status === "sent" ? "✓" : "PDF"}</div><div><span className="section-kicker">YOUR PERSONAL SCHOLARSHIP REPORT</span><h2>{report.status === "sent" ? "Your report is in your inbox." : "Your report is ready."}</h2><p>{report.message} It includes your profile summary, all 10 ranked options, reality checks, an action plan and the consultation bridge.</p></div><div className="report-status-actions"><a className="button primary compact" href={report.downloadUrl}>Download PDF</a>{report.status !== "sent" && report.emailConfigured && <button className="button ghost compact" onClick={onRetryReport} disabled={busy}>{busy ? "Sending..." : "Retry email"}</button>}</div></section>}<div className="match-notice"><span>i</span><p>{notice} Scores guide prioritization; they do not guarantee eligibility, admission, funding or a visa. Recheck the official source before acting.</p></div>{countryNotices.length > 0 && <section className="country-gap-list" aria-label="Destination coverage notices">{countryNotices.map((item) => <article key={item.country}><strong>{item.message}</strong><ul>{item.alternatives.map((alternative) => <li key={alternative}>{alternative}</li>)}</ul></article>)}</section>}<div className="finds-heading"><div><span className="section-kicker">YOUR TEN BEST OPTIONS</span><h2>{matches.length} Best Find{matches.length === 1 ? "" : "s"}</h2><p>Swipe, trackpad-scroll or use the arrows to compare your shortlist.</p></div><div className="carousel-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous opportunity">←</button><button type="button" onClick={() => move(1)} aria-label="Next opportunity">→</button></div></div>
    <div className="best-finds-rail" ref={rail} tabIndex={0} aria-label="Best Finds scholarship carousel">{matches.map((match, index) => { const stale = verificationAgeDays(match.scholarship) > 60; return <article className="find-card" key={match.scholarship.id}><div className="find-cover"><img src={campusImage(match.scholarship.provider)} alt={`${match.scholarship.provider} campus`} loading="lazy" /><span>{match.scholarship.country}</span><b>#{index + 1}</b><div className="find-score"><strong>{match.score}</strong><small>match</small></div></div><div className="find-body"><span className={`match-label ${match.label === "Strong match" ? "strong" : match.label === "Reach" ? "reach" : ""}`}>{match.label}</span><h3>{match.scholarship.name}</h3><p className="provider">{match.scholarship.provider}</p><div className="match-meta"><span>{match.scholarship.studyLevel}</span><span>{match.scholarship.coverage || "Funding varies"}</span></div><dl className="match-subscores"><div><dt>Subject</dt><dd>{match.subScores.subjectFit}/20</dd></div><div><dt>English</dt><dd>{match.subScores.englishHeadroom}/14</dd></div><div><dt>Level</dt><dd>{match.subScores.studyLevel}/18</dd></div><div><dt>Eligibility</dt><dd>{match.subScores.eligibility}/16</dd></div></dl><p className="find-rationale">{match.rationale}</p>{match.gaps.length > 0 && <div className="find-gap"><b>Check:</b> {match.gaps[0]}</div>}<div className={`verification-date ${stale ? "stale" : ""}`}><span>Catalogue checked {match.scholarship.verifiedAt || "date unavailable"}</span><strong>{stale ? "Re-verify now" : /high/i.test(match.scholarship.confidence ?? "") ? "High confidence" : "Lower confidence · verify"}</strong></div><div className="find-deadline"><span>Deadline / cycle</span><strong>{match.scholarship.deadline || "Annual / rolling"}</strong></div><button className="course-discovery-button" type="button" onClick={() => setCourseTarget(match)}><span>✦</span> Find subjects & courses <b>Official links</b></button></div><footer><Link className="match-analysis-button" href={`/dashboard/scholarship/${encodeURIComponent(match.scholarship.id)}`}>View full match analysis</Link><button type="button" onClick={() => onTrack(match.scholarship.id)}>Track</button></footer></article>; })}</div>
    <section className="top-five-analysis"><div className="finds-heading"><div><span className="section-kicker">ALL TEN · DECISION DETAIL</span><h2>Profile fit and cost planning</h2><p>Every shortlisted option includes a comparison and planning breakdown. Open a panel to review it.</p></div></div>{matches.map((match, index) => { const fitChecks = buildFitChecks(profile, match.scholarship); const costPlan = buildCostPlan(match.scholarship); return <details key={match.scholarship.id} open={index === 0}><summary><b>#{index + 1}</b><span><strong>{match.scholarship.name}</strong><small>{match.scholarship.country} · {match.score}% match</small></span><i>＋</i></summary><div className="top-five-detail-body"><section><span className="section-kicker">PROFILE VS REQUIREMENTS</span><div className="compact-fit-grid">{fitChecks.map((check) => <article key={check.label}><b>{check.label}</b><span>{check.student}</span><p>{check.requirement}</p><i className={check.status.toLowerCase().replace(" ", "-")}>{check.status}</i></article>)}</div></section><section><span className="section-kicker">DETAILED COST PLAN</span><div className="compact-cost-grid">{costPlan.map((cost) => <article key={cost.item}><b>{cost.item}</b><span>{cost.awardPosition}</span><p>{cost.planningAction}</p></article>)}</div></section><Link className="button primary compact" href={`/dashboard/scholarship/${encodeURIComponent(match.scholarship.id)}`}>Open full match analysis →</Link></div></details>; })}</section>
    <div className="consultant-cta"><div><span className="section-kicker">TURN THE REPORT INTO A PLAN</span><h2>Book a free at-office consultation.</h2><p>An EG consultant can verify the live rules, narrow your report to two or three application priorities, and map the deadlines.</p></div><button className="button primary" onClick={onConsultant}>Request consultation →</button></div>
    {courseTarget && <CourseDialog match={courseTarget} onClose={() => setCourseTarget(null)} />}</>;
}

function CourseDialog({ match, onClose }: { match: ScholarshipMatch; onClose: () => void }) {
  const [result, setResult] = useState<CourseResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/courses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scholarshipId: match.scholarship.id }), signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Courses could not be loaded");
      setResult(payload);
    }).catch((reason) => {
      if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [match.scholarship.id]);
  return <div className="course-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="course-dialog" role="dialog" aria-modal="true" aria-labelledby="course-dialog-title"><header><div><span className="section-kicker">PROFILE-RELEVANT STUDY OPTIONS</span><h2 id="course-dialog-title">Subjects & courses for this Best Find</h2><p>{match.scholarship.name} · {match.scholarship.country}</p></div><button type="button" onClick={onClose} aria-label="Close course list">×</button></header>
    {loading && <div className="course-loading"><span>✦</span><strong>Searching official course pages…</strong><p>Live AI discovery is checked first; verified official catalogue links remain available during provider limits.</p></div>}
    {error && <div className="course-error"><strong>Course discovery is unavailable right now.</strong><p>{error}</p><a href={match.scholarship.officialSource} target="_blank" rel="noreferrer">Open the official scholarship source ↗</a></div>}
    {result && <><div className="course-summary"><span>i</span><p>{result.summary}{result.providerWarning ? ` ${result.providerWarning}` : ""}</p></div>{result.courses.length ? <div className="course-list">{result.courses.map((course) => <a key={`${course.url}-${course.name}`} href={course.url} target="_blank" rel="noreferrer"><div><span>{course.level}</span><h3>{course.name}</h3><strong>{course.university}</strong><p>{course.why}</p></div><b>Official page ↗</b></a>)}</div> : <div className="course-error"><strong>No safely verifiable course links were returned.</strong><p>Use the official award page to choose a participating university or programme.</p><a href={result.officialSource} target="_blank" rel="noreferrer">Open official source ↗</a></div>}<small className="course-disclaimer">{result.disclaimer}</small></>}
  </section></div>;
}

function Applications({ matches, applications, recordCount, onUpdate }: { matches: ScholarshipMatch[]; applications: ApplicationItem[]; recordCount: number; onUpdate: (id: string, stage: string, workflow?: ApplicationWorkflow) => void }) {
  const tracked = applications.map((application) => ({ application, match: matches.find((item) => item.scholarship.id === application.scholarshipId) })).filter((item) => item.match);
  if (!tracked.length) return <section className="panel large-empty"><span>◎</span><h2>No applications tracked yet.</h2><p>Open Best Finds and choose “Track” to start a live application workflow.</p></section>;
  return <section className="panel application-workspace"><div className="panel-head"><div><span className="section-kicker">APPLICATION & PRE-DEPARTURE TRACKER</span><h2>Manage every step through arrival.</h2><p>Save application, admission, visa, payment, flight, insurance and accommodation details in one place.</p></div><span>{tracked.length} active</span></div><div className="application-hub-note"><span>▣</span><div><strong>Your tracker and records hub work together</strong><p>Record each milestone here, then store the related email, offer letter, invoice or receipt in Student Records so nothing is lost across inboxes and devices. Records remain optional, but keeping them here makes guideline checks and handovers easier.</p></div><Link href="/dashboard?tab=documents">Open Student Records · {recordCount} saved →</Link></div><div className="application-board detailed">{tracked.map(({ application, match }) => <ApplicationCard key={application.scholarshipId} application={application} match={match!} recordCount={recordCount} onSave={onUpdate} />)}</div></section>;
}

function ApplicationCard({ application, match, recordCount, onSave }: { application: ApplicationItem; match: ScholarshipMatch; recordCount: number; onSave: (id: string, stage: string, workflow?: ApplicationWorkflow) => void }) {
  const [stage, setStage] = useState(application.stage);
  const [workflow, setWorkflow] = useState<ApplicationWorkflow>(application.workflow ?? {});
  function update(key: keyof ApplicationWorkflow, value: string | boolean) { setWorkflow((current) => ({ ...current, [key]: value })); }
  function saveGuidelineResult(key: "applicationGuidelineCheck" | "visaGuidelineCheck", result: GuidelineResult) {
    const next = { ...workflow, [key]: JSON.stringify(result) };
    setWorkflow(next);
    onSave(application.scholarshipId, stage, next);
  }
  const phases = [["shortlisted", "Shortlist"], ["application", "Application"], ["admission", "Offer"], ["visa", "Visa"], ["predeparture", "Pre-departure"], ["arrived", "Arrived"]];
  const currentIndex = Math.max(0, phases.findIndex(([id]) => id === stage));
  return <article className="application-detail-card">
    <header><div><span>{match.scholarship.country}</span><h3>{match.scholarship.name}</h3><p>{application.nextAction}</p></div><Link href={`/dashboard/scholarship/${encodeURIComponent(match.scholarship.id)}`}>View analysis →</Link></header>
    <div className="application-phases">{phases.map(([id, label], index) => <button type="button" className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={id} onClick={() => setStage(id)}><b>{index < currentIndex ? "✓" : index + 1}</b><span>{label}</span></button>)}</div>
    <label className="stage-picker" htmlFor={`stage-${application.scholarshipId}`}>Current stage<select id={`stage-${application.scholarshipId}`} name="stage" value={stage} onChange={(event) => setStage(event.target.value)}>{phases.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
    <div className="workflow-grid">
      <section><h4>Application & admission</h4><Check id={`${application.scholarshipId}-submitted`} label="Application submitted" checked={workflow.applicationSubmitted} onChange={(value) => update("applicationSubmitted", value)} /><Check id={`${application.scholarshipId}-offer`} label="Admission / award offer received" checked={workflow.admissionOfferReceived} onChange={(value) => update("admissionOfferReceived", value)} /></section>
      <section><h4>Fees paid / to pay</h4><Field id={`${application.scholarshipId}-paid`} label="Paid so far" value={workflow.tuitionPaid} placeholder="Amount, currency and date" onChange={(value) => update("tuitionPaid", value)} /><Field id={`${application.scholarshipId}-outstanding`} label="Still to pay" value={workflow.outstandingFees} placeholder="Amount, currency and deadline" onChange={(value) => update("outstandingFees", value)} /></section>
      <section><h4>Visa processing</h4><Check id={`${application.scholarshipId}-visa-submitted`} label="Visa application submitted" checked={workflow.visaApplicationSubmitted} onChange={(value) => update("visaApplicationSubmitted", value)} /><Check id={`${application.scholarshipId}-visa-decision`} label="Visa decision received" checked={workflow.visaDecisionReceived} onChange={(value) => update("visaDecisionReceived", value)} /></section>
      <section><h4>Plane tickets</h4><Check id={`${application.scholarshipId}-flight-booked`} label="Flight booked" checked={workflow.flightBooked} onChange={(value) => update("flightBooked", value)} /><Field id={`${application.scholarshipId}-flight-details`} label="Flight details" value={workflow.flightDetails} placeholder="Airline, date, route, booking reference" onChange={(value) => update("flightDetails", value)} /></section>
      <section><h4>Health insurance</h4><Check id={`${application.scholarshipId}-insurance`} label="Insurance arranged" checked={workflow.insuranceArranged} onChange={(value) => update("insuranceArranged", value)} /><Field id={`${application.scholarshipId}-insurance-fee`} label="Insurance fee / policy" value={workflow.insuranceFee} placeholder="Amount, provider and policy reference" onChange={(value) => update("insuranceFee", value)} /></section>
      <section><h4>Accommodation</h4><Check id={`${application.scholarshipId}-accommodation`} label="Accommodation arranged" checked={workflow.accommodationArranged} onChange={(value) => update("accommodationArranged", value)} /><Field id={`${application.scholarshipId}-housing`} label="Housing details" value={workflow.accommodationDetails} placeholder="Address, rent, deposit and move-in date" onChange={(value) => update("accommodationDetails", value)} /></section>
    </div>
    <div className="guideline-matching"><div className="guideline-heading"><div><span className="section-kicker">LIVE REQUIREMENTS & DOCUMENT ORGANIZER</span><h4>Official checklists—even with zero uploads</h4><p>Application and destination visa sources are preselected. View the current checklist first, then optionally compare it with your {recordCount} saved record{recordCount === 1 ? "" : "s"}; file contents are never judged from their names.</p></div><Link href="/dashboard?tab=documents">Manage Student Records →</Link></div><div className="guideline-grid">
      <GuidelineMatcher phase="application" scholarshipId={application.scholarshipId} url={workflow.applicationGuidelineUrl ?? match.scholarship.officialSource} saved={workflow.applicationGuidelineCheck} recordCount={recordCount} onUrlChange={(value) => update("applicationGuidelineUrl", value)} onResult={(result) => saveGuidelineResult("applicationGuidelineCheck", result)} />
      <GuidelineMatcher phase="visa" scholarshipId={application.scholarshipId} url={workflow.visaGuidelineUrl ?? ""} saved={workflow.visaGuidelineCheck} recordCount={recordCount} onUrlChange={(value) => update("visaGuidelineUrl", value)} onResult={(result) => saveGuidelineResult("visaGuidelineCheck", result)} />
    </div></div>
    <label className="workflow-notes" htmlFor={`notes-${application.scholarshipId}`}>Notes<textarea id={`notes-${application.scholarshipId}`} name="notes" value={workflow.notes ?? ""} onChange={(event) => update("notes", event.target.value)} placeholder="Deadlines, appointments, document gaps or consultant advice" /></label>
    <footer><div className="application-record-links"><a href={match.scholarship.officialSource} target="_blank" rel="noreferrer">Check official source ↗</a><Link href="/dashboard?tab=documents">Store related email or receipt →</Link></div><button className="button primary compact" onClick={() => onSave(application.scholarshipId, stage, workflow)}>Save application plan</button></footer>
  </article>;
}

function GuidelineMatcher({ phase, scholarshipId, url, saved, recordCount, onUrlChange, onResult }: { phase: "application" | "visa"; scholarshipId: string; url: string; saved?: string; recordCount: number; onUrlChange: (value: string) => void; onResult: (result: GuidelineResult) => void }) {
  const [result, setResult] = useState<GuidelineResult | null>(() => {
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = phase === "application" ? "University application guidelines" : "Visa document guidelines";
  async function check() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/guideline-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scholarshipId, phase, guidelineUrl: url.trim() }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Guideline check failed");
      setResult(payload); onResult(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Guideline check failed"); }
    finally { setBusy(false); }
  }
  const counts = result?.requirements.reduce((total, item) => ({ ...total, [item.status]: total[item.status] + 1 }), { matched: 0, missing: 0, review: 0 }) ?? { matched: 0, missing: 0, review: 0 };
  const fieldId = `${phase}-guideline-${scholarshipId}`;
  return <section className="guideline-card"><header><span>{phase === "application" ? "A" : "V"}</span><div><h5>{title}</h5><p>{phase === "application" ? "Admission and university checklist" : "Embassy or immigration checklist for Bangladesh"}</p></div></header><label htmlFor={fieldId}>Official guideline link <small>Optional override</small><input id={fieldId} name={`${phase}GuidelineUrl`} type="url" value={url} onChange={(event) => onUrlChange(event.target.value)} placeholder="Auto-selected when left blank" /></label><button className="button guideline-check-button" type="button" disabled={busy} onClick={check}>{busy ? "Checking official page…" : recordCount ? "Check requirements + my records" : "Show official requirements"}<span>✦</span></button>{error && <p className="guideline-error" role="alert">{error}</p>}
    {result && <div className="guideline-result"><div className="guideline-source"><span>{result.mode === "live-official-ai" ? "LIVE SOURCE READ" : "OFFICIAL BASELINE"}</span>{result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer">{result.sourceLabel || "Open official source"} ↗</a>}<small>{result.liveCheck}{result.checkedAt ? ` Checked ${new Date(result.checkedAt).toLocaleString()}.` : ""}</small></div><div className="guideline-counts"><span className="matched">{counts.matched} organized</span><span className="missing">{counts.missing} not in records</span><span className="review">{counts.review} conditional / review</span></div><p>{result.summary}</p><ul>{result.requirements.map((item, index) => <li key={`${item.requirement}-${index}`} className={item.status}><b>{item.status === "matched" ? "✓" : item.status === "missing" ? "!" : "?"}</b><div><strong>{item.requirement}</strong><p>{item.note}</p>{item.matchedDocuments.length > 0 && <small>Possible record: {item.matchedDocuments.join(", ")}</small>}</div></li>)}</ul>{result.warnings.length > 0 && <details><summary>Important cautions</summary>{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details>}<small>{result.disclaimer}</small></div>}
  </section>;
}

function Check({ id, label, checked, onChange }: { id: string; label: string; checked?: boolean; onChange: (value: boolean) => void }) {
  return <label className="workflow-check" htmlFor={id}><input id={id} name={id} type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} /><span>{checked ? "✓" : ""}</span>{label}</label>;
}

function Field({ id, label, value, placeholder, onChange }: { id: string; label: string; value?: string; placeholder: string; onChange: (value: string) => void }) {
  return <label className="workflow-field" htmlFor={id}>{label}<input id={id} name={id} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Consultant({ sent, busy, email, onRequest }: { sent: boolean; busy: boolean; email: string; onRequest: () => void }) {
  const whatsappMessage = encodeURIComponent(`Hello EGC, I requested a scholarship consultation through the portal. My account email is ${email}.`);
  return <div className="dashboard-two-col"><section className="panel consultant-panel"><span className="consultant-avatar">EG</span><span className="section-kicker">FREE AT-OFFICE CONSULTATION</span><h2>Turn your report into an application plan.</h2><p>A consultant review checks profile evidence, current official requirements, budget fit, deadlines and application sequencing.</p><ul><li>Top-10 eligibility and risk review</li><li>Optional document gap checklist</li><li>Strong, Possible and Reach balance</li><li>Priority application and deadline plan</li></ul><button className="button primary" disabled={busy || sent} onClick={onRequest}>{sent ? "Consultation requested ✓" : busy ? "Sending..." : "Request free consultation"}</button>{sent && <a className="button ghost consultation-whatsapp" href={`https://wa.me/8801601247111?text=${whatsappMessage}`} target="_blank" rel="noreferrer">Also message EGC on WhatsApp</a>}</section><section className="panel contact-card"><span className="section-kicker">CONTACT</span><h2>EG Consultancy, Dhaka</h2><p>House 22, Road 1, Block Ta, Pallabi, Mirpur, Dhaka 1216, Bangladesh</p><a href="tel:+8801928207111">+880 1928-207111</a><a href="https://wa.me/8801601247111">WhatsApp +880 1601-247111</a><a href="mailto:hello.excellenceglobal@gmail.com">hello.excellenceglobal@gmail.com</a><small>Consultants verify live requirements before advising. No admission, scholarship or visa outcome is guaranteed.</small></section></div>;
}
