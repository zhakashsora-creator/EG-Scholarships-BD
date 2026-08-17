/* eslint-disable @next/next/no-img-element */
import { getStudentUser } from "./lib/auth";
import { scholarships } from "./lib/matching";
import ThemeToggle from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getStudentUser();
  const countries = new Set(scholarships.map((item) => item.country).filter(Boolean)).size;
  const target = user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <a className="brand" href="https://egconsultancy.com.bd/eg-scholarships/">
          <img className="brand-logo" src="/egc-emblem.png" alt="Excellence Global Consultancy" />
          <span><strong>EG Scholarships</strong><small>by Excellence Global Consultancy</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <ThemeToggle />
          <a className="nav-cta" href={target}>{user ? "Open dashboard" : "Sign in or sign up"}</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> Verified opportunities · Profile-led guidance</span>
          <h1>Your scholarship search, finally built around <em>your profile.</em></h1>
          <p>Build one detailed study profile. EG Scholarships compares it with our curated funding database and gives you unlimited, consultant-ready Best Finds. Documents stay completely optional.</p>
          <div className="hero-actions">
            <a className="button primary" href={target}>{user ? "Continue to your dashboard" : "Create or access my account"}<span>→</span></a>
            <a className="button ghost" href="#how">See the process</a>
          </div>
          <div className="trust-row">
            <span><b>{scholarships.length}</b> curated records</span>
            <span><b>{countries}</b> destinations</span>
            <span><b>Top 5</b> consultant-ready options</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Dashboard preview">
          <div className="product-top"><img className="mini-logo" src="/egc-emblem.png" alt="" /><span>Student workspace</span><i>Profile 82%</i></div>
          <div className="product-grid">
            <aside><b>OVERVIEW</b><span className="active">Dashboard</span><span>Study profile</span><span>Documents · optional <i>8</i></span><span>Best Finds <i>24</i></span><span>Applications</span></aside>
            <div className="product-main">
              <div className="mini-heading"><div><small>GOOD EVENING</small><h2>Your strongest options are ready.</h2></div><span>Updated today</span></div>
              <div className="match-preview">
                <div className="match-score">91<small>/100</small></div>
                <div><span className="match-label">STRONG MATCH</span><h3>Erasmus Mundus Joint Masters</h3><p>Study level, funding priority and Bangladesh eligibility align.</p></div>
                <b>#1</b>
              </div>
              <div className="mini-cards"><article><small>PROFILE</small><strong>92% ready</strong><span>Academic pathway added</span></article><article><small>DEADLINES</small><strong>3 upcoming</strong><span>Next in 41 days</span></article><article><small>CONSULTANT</small><strong>Ready to review</strong><span>Best Finds prepared</span></article></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="process-section">
        <span className="section-kicker">ONE SECURE WORKSPACE</span>
        <h2>From scattered documents to a clear next step.</h2>
        <div className="process-grid">
          {[
            ["01", "Build your profile", "Add study level, subject, destinations, intake, budget and English-test position."],
            ["02", "Upload documents", "Keep academic, language, financial and supporting records in private student storage."],
            ["03", "Review extracted facts", "On-device document reading structures supported facts and flags missing information for your confirmation."],
            ["04", "Browse your Best Finds", "Swipe through every destination match with reasoning, gaps, official sources, deadlines and consultant next steps."],
          ].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section id="privacy" className="privacy-strip">
        <div><span className="privacy-icon">⌾</span><div><strong>Private by design</strong><p>Your files are isolated per signed-in student. Document reading runs in your browser only after explicit consent.</p></div></div>
        <div><span className="privacy-icon">✓</span><div><strong>Evidence, not promises</strong><p>Every result keeps its official source and verification note. Matches support decisions; they do not guarantee awards or admission.</p></div></div>
        <a href={target}>Enter student workspace →</a>
      </section>

      <footer><span>© 2026 Excellence Global Consultancy</span><a href="https://egconsultancy.com.bd/">Return to main website</a><span>House 22, Road 1, Block Ta, Pallabi, Mirpur, Dhaka 1216</span></footer>
    </main>
  );
}
