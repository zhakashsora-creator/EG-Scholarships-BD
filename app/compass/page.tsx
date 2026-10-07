"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import styles from "./compass.module.css";
import {
  MapRenderer,
  THEMES,
  CountryFeature,
  University,
  CountryBrief,
  WorldData,
} from "../../components/compass/MapEngine";

// Static Imports of Curated Data
import geoIndexRaw from "../data/geo-scholarship-index.json";
import countryBriefsRaw from "../data/country-briefs.json";
import universitiesRaw from "../data/universities.json";

type GeoIndexEntry = {
  iso: string;
  countryEn: string;
  totalCount: number;
  fullyFundedCount: number;
  fullTuitionCount: number;
  partialCount: number;
  otherCount: number;
  scholarshipIds: string[];
  studyLevels: string[];
  intakes: string[];
  items: Array<{
    id: string;
    name: string;
    provider: string;
    coverage: string;
    fundingTier: "fully_funded" | "full_tuition" | "partial" | "other";
    studyLevel?: string;
    deadline?: string;
    status?: string;
    officialSource: string;
    overallSummary?: any;
  }>;
};

const geoIndex = geoIndexRaw as Record<string, GeoIndexEntry>;
const countryBriefs = countryBriefsRaw as Record<string, CountryBrief>;
const universities = universitiesRaw as University[];

export default function GlobalStudyCompassPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // App State
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("midnight");
  const [activeMode, setActiveMode] = useState<"scholarships" | "universities" | "top100">("scholarships");
  
  // Interactive Selection State
  const [hoveredCountry, setHoveredCountry] = useState<CountryFeature | null>(null);
  const [hoveredUniversity, setHoveredUniversity] = useState<University | null>(null);
  const [isHoveredHome, setIsHoveredHome] = useState<boolean>(false);
  const [selectedIso, setSelectedIso] = useState<string>("DEU"); // Default to Germany
  const [selectedList, setSelectedList] = useState<string[]>(["DEU"]);

  // Profile Match State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileLevel, setProfileLevel] = useState<string>("Master");
  const [profileCgpa, setProfileCgpa] = useState<string>("3.3");
  const [profileIelts, setProfileIelts] = useState<string>("6.5");
  const [profileBudget, setProfileBudget] = useState<string>("0");
  const [isProfileMatchingActive, setIsProfileMatchingActive] = useState<boolean>(false);

  // Social Export Card Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>("Tahmid");
  const [exportCardUrl, setExportCardUrl] = useState<string>("");

  // 1. Fetch world.json on mount
  useEffect(() => {
    fetch("/world.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load world map data");
        return res.json();
      })
      .then((data: WorldData) => {
        setWorldData(data);
      })
      .catch((err) => console.error("Could not load world.json", err));
  }, []);

  // 2. Initialize MapRenderer once canvas & data are ready
  useEffect(() => {
    if (!canvasRef.current || !worldData) return;

    const renderer = new MapRenderer(canvasRef.current);
    renderer.setWorldData(worldData);
    renderer.setUniversities(universities);
    renderer.setTheme(currentTheme);
    renderer.selectedCountries = new Set(selectedList);
    renderer.mode = activeMode;
    renderer.resize();
    renderer.startAnimation();

    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      renderer.stopAnimation();
      window.removeEventListener("resize", handleResize);
    };
  }, [worldData]);

  // 3. Sync theme changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTheme(currentTheme);
    }
  }, [currentTheme]);

  // 4. Sync mode changes (scholarships, universities, top100)
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.mode = activeMode;
      rendererRef.current.render();
    }
  }, [activeMode]);

  // 5. Precompute Country Profile Funding Tiers based on student profile
  const fundingTiers = useMemo(() => {
    const tiers: Record<string, "fully_funded" | "full_tuition" | "partial" | "other"> = {};
    const cgpaVal = parseFloat(profileCgpa) || 3.0;
    const ieltsVal = parseFloat(profileIelts) || 6.0;

    for (const [iso, data] of Object.entries(geoIndex)) {
      if (data.fullyFundedCount > 0 && cgpaVal >= 3.2 && ieltsVal >= 6.5) {
        tiers[iso] = "fully_funded";
      } else if (data.fullTuitionCount > 0 || (iso === "DEU" && cgpaVal >= 2.8 && ieltsVal >= 6.0)) {
        tiers[iso] = "full_tuition";
      } else if (data.partialCount > 0) {
        tiers[iso] = "partial";
      } else {
        tiers[iso] = "other";
      }
    }
    return tiers;
  }, [profileCgpa, profileIelts]);

  // Apply profile matching colors to map
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setFundingTiers(fundingTiers);
      rendererRef.current.showProfileColors = isProfileMatchingActive;
      rendererRef.current.render();
    }
  }, [fundingTiers, isProfileMatchingActive]);

  // 6. Canvas Mouse Interaction Handlers
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    const { country, university, isHome } = rendererRef.current.hitTest(e.clientX, e.clientY);

    setIsHoveredHome(isHome);
    setHoveredUniversity(university);
    setHoveredCountry(country);

    rendererRef.current.hoveredCountry = country?.i || null;
    rendererRef.current.hoveredUniversity = university;
    rendererRef.current.render();
  };

  const handleCanvasMouseLeave = () => {
    if (!rendererRef.current) return;
    setIsHoveredHome(false);
    setHoveredCountry(null);
    setHoveredUniversity(null);
    rendererRef.current.hoveredCountry = null;
    rendererRef.current.hoveredUniversity = null;
    rendererRef.current.render();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    const { country, isHome } = rendererRef.current.hitTest(e.clientX, e.clientY);

    if (isHome) {
      // Home clicked: notice is displayed in HUD
      return;
    }

    if (country) {
      setSelectedIso(country.i);
      rendererRef.current.toggleCountrySelection(country.i);
      setSelectedList(Array.from(rendererRef.current.selectedCountries));
    }
  };

  const handleClearSelection = () => {
    if (!rendererRef.current) return;
    rendererRef.current.clearSelection();
    setSelectedList([]);
  };

  // 7. Get Details for Active Selected Country
  const activeGeo = geoIndex[selectedIso] || null;
  const activeBrief = countryBriefs[selectedIso] || null;
  const activeUniversities = useMemo(() => {
    return universities.filter((u) => u.iso === selectedIso);
  }, [selectedIso]);

  // 8. Generate Shareable Export Card
  const handleOpenExportModal = () => {
    if (!rendererRef.current) return;
    const totalScholCount = selectedList.reduce((sum, iso) => sum + (geoIndex[iso]?.totalCount || 0), 0);
    const totalUni = universities.filter((u) => selectedList.includes(u.iso)).length;

    const dataUrl = rendererRef.current.generateExportCard({
      studentName,
      targetIntake: "Fall 2026 / 2027",
      totalScholarshipsCount: totalScholCount,
      totalUnivCount: totalUni,
    });
    setExportCardUrl(dataUrl);
    setIsExportModalOpen(true);
  };

  const hudTarget = hoveredCountry || (selectedIso ? worldData?.f.find((f) => f.i === selectedIso) : null);
  const hudGeo = hudTarget ? geoIndex[hudTarget.i] : null;
  const hudBrief = hudTarget ? countryBriefs[hudTarget.i] : null;

  return (
    <main
      className={styles.compassShell}
      style={
        {
          "--cp-bg": THEMES[currentTheme].bg,
          "--cp-text": THEMES[currentTheme].text,
          "--cp-hud-bg": THEMES[currentTheme].hudBg,
          "--cp-hud-border": THEMES[currentTheme].hudBorder,
        } as React.CSSProperties
      }
    >
      {/* 1. Header Navigation */}
      <header className={styles.navHeader}>
        <Link className={styles.brandWrap} href="/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.brandLogo} src="/egc-emblem.png" alt="Excellence Global Consultancy" />
          <div>
            <div className={styles.brandTitle}>
              EG Scholarships <span className={styles.brandBadge}>Compass</span>
            </div>
            <div className={styles.brandSub}>Interactive Global Study & Scholarship Map</div>
          </div>
        </Link>

        <div className={styles.headerActions}>
          <button
            className={`${styles.actionBtn} ${isProfileMatchingActive ? styles.actionBtnPrimary : ""}`}
            onClick={() => setIsProfileModalOpen(true)}
          >
            <span>🎯</span> Match My Profile
          </button>

          <button className={styles.actionBtn} onClick={handleOpenExportModal}>
            <span>📸</span> Download My Map
          </button>

          {/* Theme Selector Swatches */}
          <div className={styles.themeWrap} title="Change Map Theme">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                className={`${styles.themeSwatch} ${currentTheme === t.id ? styles.themeSwatchActive : ""}`}
                style={{ background: t.v1 }}
                onClick={() => setCurrentTheme(t.id)}
                aria-label={t.name}
              />
            ))}
          </div>

          <Link className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} href="/dashboard">
            Back to Portal →
          </Link>
        </div>
      </header>

      {/* 2. Zero-Overlap Dynamic HUD Ribbon (STRICTLY ABOVE MAP) */}
      <section className={styles.hudRibbon} id="compass-hud">
        <div className={styles.hudLeft}>
          {isHoveredHome ? (
            <div className={styles.hudPrompt}>
              <span className={styles.hudFlag}>🇧🇩</span>
              <strong>বাংলাদেশ (ঢাকা) — আপনার হোম লোকেশন</strong>
              <span>উচ্চশিক্ষার লক্ষ্য হিসেবে বিশ্বের যেকোনো গন্তব্য দেশ ক্লিক করুন (Dhaka Origin) ↗</span>
            </div>
          ) : hudTarget ? (
            <>
              <span className={styles.hudFlag}>{hudBrief?.flag || "🌍"}</span>
              <span className={styles.hudCountryName}>
                {hudTarget.n}
                <small className={styles.hudCountryBn}>({hudTarget.b || hudBrief?.nameBn || ""})</small>
              </span>
              <div className={styles.hudPills}>
                {hudGeo ? (
                  <>
                    <span className={`${styles.hudPill} ${styles.hudPillGold}`}>
                      🎓 {hudGeo.totalCount} Scholarships
                    </span>
                    {hudGeo.fullyFundedCount > 0 && (
                      <span className={`${styles.hudPill} ${styles.hudPillGreen}`}>
                        🟢 {hudGeo.fullyFundedCount} Fully Funded
                      </span>
                    )}
                  </>
                ) : (
                  <span className={styles.hudPill}>Global Study Destination</span>
                )}
                {hudBrief && (
                  <span className={`${styles.hudPill} ${styles.hudPillBlue}`}>
                    🏛️ {hudBrief.tuition.slice(0, 32)}...
                  </span>
                )}
                {universities.filter((u) => u.iso === hudTarget.i).length > 0 && (
                  <span className={styles.hudPill}>
                    🌟 {universities.filter((u) => u.iso === hudTarget.i).length} QS Top Universities
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className={styles.hudPrompt}>
              <span>🗺️</span>
              <span>
                মানচিত্রের যেকোনো দেশের ওপর মাউস রাখুন অথবা ক্লিক করুন •{" "}
                <strong>৫০+ দেশের স্কলারশিপ ও শীর্ষ বিশ্ববিদ্যালয় দেখুন</strong> (বাংলাদেশ ব্যতীত)
              </span>
            </div>
          )}
        </div>

        <div className={styles.hudRight}>
          {isProfileMatchingActive && (
            <span className={`${styles.hudPill} ${styles.hudPillGreen}`}>
              ✓ Profile Filter Active ({profileLevel} · CGPA {profileCgpa})
            </span>
          )}
        </div>
      </section>

      {/* 3. Main Split-Screen Workspace */}
      <section className={styles.mainGrid}>
        {/* Left Column: Interactive Vector Canvas */}
        <div className={styles.mapColumn}>
          {/* Mode Tabs */}
          <div className={styles.mapToolbar}>
            <div className={styles.modeTabs}>
              <button
                className={`${styles.tabBtn} ${activeMode === "scholarships" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("scholarships")}
              >
                🎓 স্কলারশিপ ডিরেক্টরি (Scholarships)
              </button>
              <button
                className={`${styles.tabBtn} ${activeMode === "universities" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("universities")}
              >
                🏛️ শীর্ষ বিশ্ববিদ্যালয় (Universities)
              </button>
              <button
                className={`${styles.tabBtn} ${activeMode === "top100" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("top100")}
              >
                🌟 গ্লোবাল টপ ১০০ পিন (Top 100 Pinpoint)
              </button>
            </div>

            {selectedList.length > 0 && (
              <div className={styles.selectionPill}>
                <span>🎯 {selectedList.length} Selected</span>
                <button className={styles.clearBtn} onClick={handleClearSelection}>
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* HTML5 Canvas Container */}
          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              className={styles.mapCanvas}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              onClick={handleCanvasClick}
            />
          </div>

          {/* Bottom Map Legend */}
          <footer className={styles.mapFooter}>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#059669" }}></span>
                <span>🇧🇩 ঢাকা (Home Origin)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#F5B041" }}></span>
                <span>Selected Destination</span>
              </div>
              {isProfileMatchingActive && (
                <>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "#10B981" }}></span>
                    <span>Fully Funded Match</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "#38BDF8" }}></span>
                    <span>Full Tuition Waiver</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: "#F59E0B" }}></span>
                    <span>Partial Scholarship</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ color: "#94A3B8" }}>Click any country to open details • Click multiple to build your plan</div>
          </footer>
        </div>

        {/* Right Column: Sliding Window Panel */}
        <aside className={styles.windowPanel}>
          {activeBrief || activeGeo ? (
            <>
              <header className={styles.panelHeader}>
                <div className={styles.countryHero}>
                  <span className={styles.heroFlag}>{activeBrief?.flag || "🌍"}</span>
                  <div>
                    <div className={styles.heroTitle}>
                      {activeBrief?.nameEn || activeGeo?.countryEn}
                      <small className={styles.heroBn}>({activeBrief?.nameBn || ""})</small>
                    </div>
                    <div className={styles.heroSub}>
                      {activeBrief?.continent || "Europe"} • Capital: {activeBrief?.capital || "Major Hub"} • {activeGeo?.totalCount || 0} Aggregated Awards
                    </div>
                  </div>
                </div>
              </header>

              {/* BD Student Perspective Overview Brief */}
              {activeBrief && (
                <div className={styles.briefBox}>
                  <div className={styles.briefHeading}>
                    <span>🇧🇩</span> বাংলাদেশি শিক্ষার্থীদের জন্য বাস্তবতা (BD Perspective)
                  </div>
                  <div className={styles.briefGrid}>
                    <div className={styles.briefRow}>
                      <b>🏷️ টিউশন ফি:</b>
                      <span>{activeBrief.tuition}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>💰 লিভিং কস্ট:</b>
                      <span>{activeBrief.livingCost}</span>
                    </div>
                    {activeBrief.blockedAccount && (
                      <div className={styles.briefRow}>
                        <b>🏦 ব্যাংক সলভেন্সি:</b>
                        <span>{activeBrief.blockedAccount}</span>
                      </div>
                    )}
                    <div className={styles.briefRow}>
                      <b>💼 পোস্ট-স্টাডি ভিসা:</b>
                      <span>{activeBrief.psw}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>🗣️ আইইএলটিএস ব্যান্ড:</b>
                      <span>{activeBrief.ielts}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>⏳ ভিসা প্রসেসিং:</b>
                      <span>{activeBrief.visaDhaka}</span>
                    </div>
                  </div>
                  <div className={styles.briefTip}>
                    <strong>💡 পরামর্শ:</strong> {activeBrief.successTip}
                  </div>
                </div>
              )}

              {/* Dynamic Content based on Active Mode */}
              <div className={styles.panelContent}>
                {activeMode === "universities" ? (
                  <>
                    <div className={styles.sectionTitle}>
                      <span>শীর্ষ বিশ্ববিদ্যালয় ({activeUniversities.length})</span>
                      <small>QS World Rankings</small>
                    </div>
                    {activeUniversities.length > 0 ? (
                      activeUniversities.map((u) => (
                        <article key={u.name} className={styles.univCard}>
                          <div className={styles.univRank}>
                            <small>QS</small>
                            <span>#{u.rank}</span>
                          </div>
                          <div className={styles.univInfo}>
                            <div className={styles.univName}>{u.name}</div>
                            <div className={styles.univCity}>📍 {u.city}</div>
                            <div className={styles.univStrengths}>✨ {u.strengths}</div>
                            <span className={styles.univPsw}>PSW: {u.psw}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p style={{ color: "#94A3B8", fontSize: "0.85rem", padding: "10px 0" }}>
                        Selected country has high-repute national institutions. Switch to Scholarships tab to explore university-linked awards.
                      </p>
                    )}
                  </>
                ) : activeMode === "top100" ? (
                  <>
                    <div className={styles.sectionTitle}>
                      <span>বিশ্বের শীর্ষ ১০০ প্রতিষ্ঠান (QS Top 100)</span>
                      <small>{universities.length} Tracked</small>
                    </div>
                    {universities.slice(0, 15).map((u) => (
                      <article key={u.name} className={styles.univCard}>
                        <div className={styles.univRank}>
                          <small>QS</small>
                          <span>#{u.rank}</span>
                        </div>
                        <div className={styles.univInfo}>
                          <div className={styles.univName}>{u.name}</div>
                          <div className={styles.univCity}>📍 {u.city}, {u.country}</div>
                          <div className={styles.univStrengths}>✨ {u.strengths}</div>
                        </div>
                      </article>
                    ))}
                  </>
                ) : (
                  <>
                    <div className={styles.sectionTitle}>
                      <span>স্কলারশিপ ও অনুদান ({activeGeo?.items.length || 0})</span>
                      <small>EG Verified Database</small>
                    </div>
                    {activeGeo?.items && activeGeo.items.length > 0 ? (
                      activeGeo.items.map((s) => (
                        <article key={s.id} className={styles.scholarshipCard}>
                          <div className={styles.cardTop}>
                            <div className={styles.cardName}>{s.name}</div>
                            <span
                              className={`${styles.tierBadge} ${
                                s.fundingTier === "fully_funded"
                                  ? styles.tierFullyFunded
                                  : s.fundingTier === "full_tuition"
                                  ? styles.tierFullTuition
                                  : s.fundingTier === "partial"
                                  ? styles.tierPartial
                                  : styles.tierOther
                              }`}
                            >
                              {s.fundingTier === "fully_funded"
                                ? "Fully Funded"
                                : s.fundingTier === "full_tuition"
                                ? "100% Tuition"
                                : "Partial / Discount"}
                            </span>
                          </div>

                          <div className={styles.cardProvider}>{s.provider}</div>

                          <div className={styles.cardMeta}>
                            <span>💰 {s.coverage?.slice(0, 40) || "Funding varies"}...</span>
                            <span>📅 {s.deadline || "Upcoming Intake"}</span>
                          </div>

                          <div className={styles.cardActions}>
                            <Link
                              className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                              href={`/dashboard/scholarship/${encodeURIComponent(s.id)}`}
                            >
                              View match analysis ↗
                            </Link>
                            <a
                              className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                              href={s.officialSource}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Official source
                            </a>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p style={{ color: "#94A3B8", fontSize: "0.85rem", padding: "10px 0" }}>
                        No direct national awards stored for this territory; check European multilateral schemes like Erasmus Mundus.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>🗺️ No Country Selected</p>
              <p style={{ fontSize: "0.85rem" }}>
                Click any country on the world map to view costs, scholarships, and universities from a Bangladeshi perspective.
              </p>
            </div>
          )}
        </aside>
      </section>

      {/* 4. Match My Profile Modal */}
      {isProfileModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>🎯 Match My Profile on World Map</h2>
              <button className={styles.closeBtn} onClick={() => setIsProfileModalOpen(false)}>
                ×
              </button>
            </header>

            <p style={{ color: "#94A3B8", fontSize: "0.88rem", marginBottom: "18px" }}>
              আপনার প্রোফাইল তথ্য ইনপুট দিন — পুরো বিশ্ব মানচিত্র আপনার যোগ্যতা অনুযায়ী ফান্ডিং কালারে আলোকিত হয়ে উঠবে!
            </p>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Study Level / ডিগ্রির স্তর</label>
                <select value={profileLevel} onChange={(e) => setProfileLevel(e.target.value)}>
                  <option value="Bachelor">Bachelor / আন্ডারগ্র্যাজুয়েট</option>
                  <option value="Master">Master / মাস্টার্স</option>
                  <option value="PhD">PhD / পিএইচডি</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>CGPA / একাডেমিক ফলাফল (out of 4.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="2.0"
                  max="4.0"
                  value={profileCgpa}
                  onChange={(e) => setProfileCgpa(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>IELTS / ইংরেজি স্কোর</label>
                <select value={profileIelts} onChange={(e) => setProfileIelts(e.target.value)}>
                  <option value="6.0">IELTS 6.0</option>
                  <option value="6.5">IELTS 6.5 (Standard)</option>
                  <option value="7.0">IELTS 7.0 (Competitive)</option>
                  <option value="7.5">IELTS 7.5+ (High-Tier)</option>
                  <option value="5.5">IELTS 5.5 / MOI Route</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Self-Funding Budget / বাজেট (BDT)</label>
                <select value={profileBudget} onChange={(e) => setProfileBudget(e.target.value)}>
                  <option value="0">০ টাকা (শুধুমাত্র ফুললি ফান্ডেড)</option>
                  <option value="500000">৫ - ১০ লাখ টাকা</option>
                  <option value="1500000">১৫ - ২৫ লাখ টাকা</option>
                  <option value="3500000">৩৫+ লাখ টাকা (সেলফ ফান্ডেড)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setIsProfileMatchingActive(false);
                  setIsProfileModalOpen(false);
                }}
              >
                Reset Filter
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => {
                  setIsProfileMatchingActive(true);
                  setIsProfileModalOpen(false);
                }}
              >
                Apply to Map ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Download / Social Export Card Modal */}
      {isExportModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExportModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2>📸 আপনার স্টাডি অ্যাব্রড ব্লুপ্রিন্ট ডাউনলোড করুন</h2>
              <button className={styles.closeBtn} onClick={() => setIsExportModalOpen(false)}>
                ×
              </button>
            </header>

            <p style={{ color: "#94A3B8", fontSize: "0.85rem", marginBottom: "14px" }}>
              আপনার নির্বাচিত গন্তব্য ও স্কলারশিপের সারসংক্ষেপ দিয়ে তৈরি প্রফেশনাল ম্যাপ কার্ড। সোশ্যাল মিডিয়ায় বা বন্ধুদের সাথে শেয়ার করুন!
            </p>

            <div className={styles.formGroup} style={{ marginBottom: "14px" }}>
              <label>আপনার নাম (Name on Map):</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="যেমন: Tahmid"
              />
            </div>

            {exportCardUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exportCardUrl} alt="Export Map Card" className={styles.exportPreview} />
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className={styles.actionBtn} onClick={() => setIsExportModalOpen(false)}>
                Cancel
              </button>
              {exportCardUrl && (
                <a
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  href={exportCardUrl}
                  download={`${studentName || "My"}-Study-Abroad-Map.png`}
                >
                  Download PNG Card 💾
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
