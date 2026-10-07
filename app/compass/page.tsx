"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

export type ScholarshipItem = {
  id: string;
  name: string;
  provider: string;
  coverage: string;
  fundingTier: "fully_funded" | "full_tuition" | "partial" | "other";
  studyLevel?: string;
  deadline?: string;
  status?: string;
  officialSource: string;
  overallSummary?: {
    cost?: string;
    benefits?: string;
    other?: string;
  };
};

export type GeoIndexEntry = {
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
  items: ScholarshipItem[];
};

const geoIndex = geoIndexRaw as Record<string, GeoIndexEntry>;
const countryBriefs = countryBriefsRaw as Record<string, CountryBrief>;
const universities = universitiesRaw as University[];

// Popular study abroad destinations for quick chips
const POPULAR_DESTINATIONS = [
  { iso: "DEU", name: "জার্মানি", flag: "🇩🇪" },
  { iso: "GBR", name: "যুক্তরাজ্য", flag: "🇬🇧" },
  { iso: "USA", name: "যুক্তরাষ্ট্র", flag: "🇺🇸" },
  { iso: "CAN", name: "কানাডা", flag: "🇨🇦" },
  { iso: "AUS", name: "অস্ট্রেলিয়া", flag: "🇦🇺" },
  { iso: "JPN", name: "জাপান", flag: "🇯🇵" },
  { iso: "ITA", name: "ইতালি", flag: "🇮🇹" },
  { iso: "HUN", name: "হাঙ্গেরি", flag: "🇭🇺" },
  { iso: "SWE", name: "সুইডেন", flag: "🇸🇪" },
  { iso: "MYS", name: "মালয়েশিয়া", flag: "🇲🇾" },
  { iso: "KOR", name: "দক্ষিণ কোরিয়া", flag: "🇰🇷" },
  { iso: "FRA", name: "ফ্রান্স", flag: "🇫🇷" },
  { iso: "NLD", name: "নেদারল্যান্ডস", flag: "🇳🇱" },
  { iso: "TUR", name: "তুরস্ক", flag: "🇹🇷" },
  { iso: "CHN", name: "চীন", flag: "🇨🇳" },
  { iso: "KAZ", name: "কাজাখস্তান", flag: "🇰🇿" },
  { iso: "KGZ", name: "কিরগিজস্তান", flag: "🇰🇬" },
  { iso: "AZE", name: "আজারবাইজান", flag: "🇦🇿" },
  { iso: "RUS", name: "রাশিয়া", flag: "🇷🇺" },
];

/**
 * Robust profile match evaluation for a single scholarship
 */
function isScholarshipMatch(
  item: ScholarshipItem,
  level: string,
  cgpa: number,
  ielts: number,
  budget: string
): boolean {
  // 1. Study level criteria
  if (item.studyLevel) {
    const sl = item.studyLevel.toLowerCase();
    if (level === "Bachelor" && !/bachelor|undergraduate|foundation|pathway|diploma|first-year/i.test(sl)) {
      return false;
    }
    if (level === "Master" && !/master|postgraduate|graduate|taught|mres|msc|one-tier/i.test(sl)) {
      return false;
    }
    if (level === "PhD" && !/phd|doctoral|doctorate|research|dphil|postdoc/i.test(sl)) {
      return false;
    }
  }

  // 2. Budget criteria
  if (budget === "0") {
    // Requires fully funded
    if (item.fundingTier !== "fully_funded") return false;
  } else if (budget === "500000") {
    // 5-10 Lakh BDT: fully funded or 100% tuition waiver
    if (item.fundingTier !== "fully_funded" && item.fundingTier !== "full_tuition") return false;
  } else if (budget === "1500000") {
    // 15-25 Lakh BDT: partial funding or better
    if (item.fundingTier === "other") return false;
  }

  // 3. Academic CGPA criteria
  if (item.fundingTier === "fully_funded") {
    if (cgpa < 3.0) return false;
  } else if (item.fundingTier === "full_tuition") {
    if (cgpa < 2.7) return false;
  } else if (item.fundingTier === "partial") {
    if (cgpa < 2.4) return false;
  }

  // 4. English IELTS criteria
  if (item.fundingTier === "fully_funded") {
    if (ielts < 6.0) return false;
  } else if (item.fundingTier === "full_tuition") {
    if (ielts < 5.5) return false;
  }

  return true;
}

export default function GlobalStudyCompassPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // App State
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("midnight");
  const [activeMode, setActiveMode] = useState<"scholarships" | "universities" | "top100">("scholarships");

  // Selection & Hover State (No country auto-selected at start!)
  const [hoveredCountry, setHoveredCountry] = useState<CountryFeature | null>(null);
  const [hoveredUniversity, setHoveredUniversity] = useState<University | null>(null);
  const [isHoveredHome, setIsHoveredHome] = useState<boolean>(false);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  // In-Page Detail Modal (Zero Login Barrier)
  const [detailScholarship, setDetailScholarship] = useState<ScholarshipItem | null>(null);

  // Profile Matching State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileLevel, setProfileLevel] = useState<string>("Master");
  const [profileCgpa, setProfileCgpa] = useState<string>("3.3");
  const [profileIelts, setProfileIelts] = useState<string>("6.5");
  const [profileBudget, setProfileBudget] = useState<string>("0");
  const [isProfileMatchingActive, setIsProfileMatchingActive] = useState<boolean>(false);
  const [showOnlyMatching, setShowOnlyMatching] = useState<boolean>(true);

  // Social Export Card Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>("Tahmid");
  const [featuredScholarshipId, setFeaturedScholarshipId] = useState<string>("none");
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
    renderer.selectedCountry = selectedIso;
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

  // 5. Compute Accurate Profile Funding Tiers for Map Coloring
  const fundingTiers = useMemo(() => {
    const tiers: Record<string, "fully_funded" | "full_tuition" | "partial" | "other"> = {};
    const cgpaVal = parseFloat(profileCgpa) || 3.0;
    const ieltsVal = parseFloat(profileIelts) || 6.0;

    for (const [iso, data] of Object.entries(geoIndex)) {
      const matching = data.items.filter((item) =>
        isScholarshipMatch(item, profileLevel, cgpaVal, ieltsVal, profileBudget)
      );

      if (matching.some((m) => m.fundingTier === "fully_funded")) {
        tiers[iso] = "fully_funded";
      } else if (matching.some((m) => m.fundingTier === "full_tuition")) {
        tiers[iso] = "full_tuition";
      } else if (matching.some((m) => m.fundingTier === "partial")) {
        tiers[iso] = "partial";
      } else {
        tiers[iso] = "other";
      }
    }
    return tiers;
  }, [profileLevel, profileCgpa, profileIelts, profileBudget]);

  // Sync profile colors with map engine
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setFundingTiers(fundingTiers);
      rendererRef.current.showProfileColors = isProfileMatchingActive;
      rendererRef.current.render();
    }
  }, [fundingTiers, isProfileMatchingActive]);

  // 6. Interactive Canvas Click / Mouse Handlers (Enforces Single Country Selection)
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

    if (isHome) return;

    if (country) {
      if (country.i === "BGD") return; // Bangladesh is home origin, not destination
      // Single selection toggle: clicking current deselects; clicking another selects exclusively
      const nextIso = selectedIso === country.i ? null : country.i;
      setSelectedIso(nextIso);
      rendererRef.current.selectCountry(country.i);
    }
  };

  const handleSelectCountry = (iso: string) => {
    if (iso === "BGD") return;
    const nextIso = selectedIso === iso ? null : iso;
    setSelectedIso(nextIso);
    if (rendererRef.current) {
      rendererRef.current.selectCountry(iso);
    }
  };

  const handleClearSelection = () => {
    setSelectedIso(null);
    if (rendererRef.current) {
      rendererRef.current.clearSelection();
    }
  };

  // 7. Active Selected Country Data
  const activeGeo = selectedIso ? geoIndex[selectedIso] || null : null;
  const activeBrief = selectedIso ? countryBriefs[selectedIso] || null : null;
  const activeUniversities = useMemo(() => {
    if (!selectedIso) return [];
    return universities.filter((u) => u.iso === selectedIso);
  }, [selectedIso]);

  // 8. Matching Scholarships for the Selected Country
  const matchingItems = useMemo(() => {
    if (!activeGeo) return [];
    const cgpaVal = parseFloat(profileCgpa) || 3.0;
    const ieltsVal = parseFloat(profileIelts) || 6.0;
    return activeGeo.items.filter((item) =>
      isScholarshipMatch(item, profileLevel, cgpaVal, ieltsVal, profileBudget)
    );
  }, [activeGeo, profileLevel, profileCgpa, profileIelts, profileBudget]);

  // 9. Generate Shareable Social Card with Featured Award
  const updateExportCard = useCallback((name: string, featId: string) => {
    if (!rendererRef.current) return;

    let featScholarship: { name: string; country: string; coverage: string; studyLevel?: string } | undefined = undefined;

    if (featId && featId !== "none") {
      for (const entry of Object.values(geoIndex)) {
        const found = entry.items.find((it) => it.id === featId);
        if (found) {
          featScholarship = {
            name: found.name,
            country: entry.countryEn,
            coverage: found.coverage,
            studyLevel: found.studyLevel,
          };
          break;
        }
      }
    }

    const totalScholCount = selectedIso ? (geoIndex[selectedIso]?.totalCount || 0) : 602;
    const totalUni = selectedIso ? universities.filter((u) => u.iso === selectedIso).length : universities.length;

    const dataUrl = rendererRef.current.generateExportCard({
      studentName: name,
      targetIntake: "Fall 2026 / 2027",
      totalScholarshipsCount: totalScholCount,
      totalUnivCount: totalUni,
      featuredScholarship: featScholarship,
    });
    setExportCardUrl(dataUrl);
  }, [selectedIso]);

  const handleOpenExportModal = () => {
    // If a country is selected and has items, default featured scholarship to the first one
    const initialFeatId = activeGeo && activeGeo.items.length > 0 ? activeGeo.items[0].id : "none";
    setFeaturedScholarshipId(initialFeatId);
    updateExportCard(studentName, initialFeatId);
    setIsExportModalOpen(true);
  };

  // Top HUD target: Hovered country has priority; otherwise currently selected country
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
      {/* 1. Top Navigation Bar */}
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

      {/* 2. Zero-Overlap Dynamic HUD Ribbon (Above Map) */}
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
              <span style={{ fontSize: "1.2rem" }}>✨</span>
              <span>
                <strong>স্বাগতম EG Global Study Compass-এ!</strong> মানচিত্রের যেকোনো দেশে ক্লিক করে স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয় এক্সপ্লোর করুন।
              </span>
            </div>
          )}
        </div>

        <div className={styles.hudRight}>
          {isProfileMatchingActive && (
            <span className={`${styles.hudPill} ${styles.hudPillGreen}`}>
              ✓ Profile Match: {profileLevel} · CGPA {profileCgpa} · IELTS {profileIelts}
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

            {selectedIso && (
              <div className={styles.selectionPill}>
                <span>🎯 {geoIndex[selectedIso]?.countryEn || selectedIso} Selected</span>
                <button className={styles.clearBtn} onClick={handleClearSelection} title="Deselect country">
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

            <div style={{ color: "#94A3B8" }}>
              Click any country to open details • Click again to deselect
            </div>
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
                      {activeBrief?.continent || "International Hub"} • Capital: {activeBrief?.capital || "Major City"} • {activeGeo?.totalCount || 0} Aggregated Awards
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
                    {/* Scholarship Profile Matching Filter Ribbon */}
                    {isProfileMatchingActive && activeGeo && (
                      <div className={styles.matchBanner}>
                        <div className={styles.matchBannerTop}>
                          <span className={styles.matchBannerText}>
                            🎯 প্রোফাইল ফিল্টার সক্রিয়: {showOnlyMatching ? `ম্যাচিং স্কলারশিপ (${matchingItems.length})` : `সব স্কলারশিপ (${activeGeo.items.length})`}
                          </span>
                          <button
                            className={styles.matchToggleBtn}
                            onClick={() => setShowOnlyMatching((prev) => !prev)}
                          >
                            {showOnlyMatching ? `সব দেখুন (${activeGeo.items.length})` : `শুধু ম্যাচিং (${matchingItems.length})`}
                          </button>
                        </div>
                        <small style={{ color: "#CBD5E1", fontSize: "0.72rem" }}>
                          যোগ্যতা: {profileLevel} · CGPA {profileCgpa} · IELTS {profileIelts} · {profileBudget === "0" ? "১০০% ফ্রি/ফুললি ফান্ডেড" : `বাজেট ${profileBudget} BDT`}
                        </small>
                      </div>
                    )}

                    <div className={styles.sectionTitle}>
                      <span>
                        স্কলারশিপ ও অনুদান (
                        {isProfileMatchingActive && showOnlyMatching
                          ? matchingItems.length
                          : activeGeo?.items.length || 0}
                        )
                      </span>
                      <small>EG Verified Database</small>
                    </div>

                    {/* Check if profile filter active and 0 matches */}
                    {isProfileMatchingActive && showOnlyMatching && matchingItems.length === 0 ? (
                      <div className={styles.noMatchNotice}>
                        <div>
                          🔍 আপনার বর্তমান প্রোফাইল ক্রাইটেরিয়ার সাথে এই দেশের কোনো স্কলারশিপ সরাসরি মিলছে না।
                        </div>
                        <button
                          className={styles.matchToggleBtn}
                          onClick={() => setShowOnlyMatching(false)}
                        >
                          এই দেশের সব ({activeGeo?.items.length || 0}) স্কলারশিপ দেখুন
                        </button>
                      </div>
                    ) : (
                      (isProfileMatchingActive && showOnlyMatching ? matchingItems : activeGeo?.items || []).map((s) => (
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
                            <span>💰 {s.coverage?.slice(0, 42) || "Funding varies"}...</span>
                            <span>📅 {s.deadline || "Upcoming Intake"}</span>
                          </div>

                          <div className={styles.cardActions}>
                            {/* In-Page Details Modal Button (Zero Login Barrier) */}
                            <button
                              className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                              onClick={() => setDetailScholarship(s)}
                            >
                              View details 🔍
                            </button>
                            <a
                              className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                              href={s.officialSource}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Official source ↗
                            </a>
                          </div>
                        </article>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            /* Welcome & Onboarding View When No Country is Selected */
            <div className={styles.welcomeWrap}>
              <div className={styles.welcomeHero}>
                <span className={styles.welcomeHeroBadge}>✨ Global Study Compass</span>
                <h1 className={styles.welcomeHeroTitle}>গ্লোবাল স্টাডি কম্পাস</h1>
                <p className={styles.welcomeHeroSub}>
                  বাংলাদেশি শিক্ষার্থীদের জন্য ৭৮+ দেশের স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয়ের সমন্বিত ইন্টারেক্টিভ ম্যাপ।
                </p>
                <div className={styles.welcomeHeroMotto}>
                  &ldquo;Study abroad with a plan, not confusion.&rdquo; — Excellence Global
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className={styles.welcomeStatsGrid}>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>৬০২+</span>
                  <span className={styles.welcomeStatLabel}>ভেরিফায়েড স্কলারশিপ</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>৭৮+</span>
                  <span className={styles.welcomeStatLabel}>গ্লোবাল গন্তব্য দেশ</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>১০০</span>
                  <span className={styles.welcomeStatLabel}>QS শীর্ষ বিশ্ববিদ্যালয়</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>০৳</span>
                  <span className={styles.welcomeStatLabel}>১০০% উন্মুক্ত এক্সেস</span>
                </div>
              </div>

              {/* 3 Easy Steps Walkthrough */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeSectionTitle}>
                  <span>🚀</span> কীভাবে ব্যবহার করবেন (How to Use)
                </div>
                <div className={styles.welcomeStepsList}>
                  <div className={styles.welcomeStepItem}>
                    <span className={styles.welcomeStepNum}>১</span>
                    <div>
                      <strong>মানচিত্রের যেকোনো দেশে ক্লিক করুন:</strong> খরচ, ভিসা, স্কলারশিপ ও বিশ্ববিদ্যালয়ের সম্পূর্ণ বাস্তব চিত্র দেখুন।
                    </div>
                  </div>
                  <div className={styles.welcomeStepItem}>
                    <span className={styles.welcomeStepNum}>২</span>
                    <div>
                      <strong>&apos;Match My Profile&apos; ব্যবহার করুন:</strong> আপনার ডিগ্রি, CGPA ও বাজেট দিয়ে মানচিত্রে ফান্ডিং কালার কোড দেখুন।
                    </div>
                  </div>
                  <div className={styles.welcomeStepItem}>
                    <span className={styles.welcomeStepNum}>৩</span>
                    <div>
                      <strong>&apos;Download My Map&apos; দিয়ে ব্লুপ্রিন্ট সেভ করুন:</strong> আপনার পছন্দের স্কলারশিপসহ সোশ্যাল মিডিয়া কার্ড ডাউনলোড করুন।
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Explore Popular Destinations */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeSectionTitle}>
                  <span>🌍</span> জনপ্রিয় গন্তব্যগুলো দেখুন (Popular Destinations)
                </div>
                <div className={styles.welcomeChipsWrap}>
                  {POPULAR_DESTINATIONS.map((d) => (
                    <button
                      key={d.iso}
                      className={styles.welcomeChip}
                      onClick={() => handleSelectCountry(d.iso)}
                    >
                      <span>{d.flag}</span>
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      {/* 4. In-Page Scholarship Detail Modal (Zero Login Barrier) */}
      {detailScholarship && (
        <div className={styles.modalOverlay} onClick={() => setDetailScholarship(null)}>
          <div className={styles.detailModalBox} onClick={(e) => e.stopPropagation()}>
            <header className={styles.detailHeader}>
              <div className={styles.detailTitleWrap}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "1.4rem" }}>
                    {countryBriefs[detailScholarship.id.split("-")[0]]?.flag ||
                      (selectedIso && countryBriefs[selectedIso]?.flag) ||
                      "🌍"}
                  </span>
                  <span
                    className={`${styles.tierBadge} ${
                      detailScholarship.fundingTier === "fully_funded"
                        ? styles.tierFullyFunded
                        : detailScholarship.fundingTier === "full_tuition"
                        ? styles.tierFullTuition
                        : detailScholarship.fundingTier === "partial"
                        ? styles.tierPartial
                        : styles.tierOther
                    }`}
                  >
                    {detailScholarship.fundingTier === "fully_funded"
                      ? "Fully Funded"
                      : detailScholarship.fundingTier === "full_tuition"
                      ? "100% Tuition Waiver"
                      : "Partial / Discount"}
                  </span>
                </div>
                <h2 className={styles.detailTitle}>{detailScholarship.name}</h2>
                <span className={styles.detailProvider}>🏛️ {detailScholarship.provider}</span>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setDetailScholarship(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </header>

            {/* Meta pills */}
            <div className={styles.detailMetaPills}>
              <span className={styles.detailMetaPill}>
                🎓 ডিগ্রি স্তর: {detailScholarship.studyLevel || "All Levels (Bachelor / Master / PhD)"}
              </span>
              <span className={styles.detailMetaPill}>
                📅 ডেডলাইন: {detailScholarship.deadline || "Annual / Upcoming Call"}
              </span>
              <span className={styles.detailMetaPill}>
                📋 স্ট্যাটাস: {detailScholarship.status || "Active / Verified"}
              </span>
            </div>

            {/* Structured Comprehensive Summary */}
            <div className={styles.detailSections}>
              <div className={styles.detailSectionCard}>
                <div className={styles.detailSectionHeader}>
                  <span>💰</span> খরচ ও ফান্ডিং কাভারেজ (Cost & Funding)
                </div>
                <div className={styles.detailSectionBody}>
                  {detailScholarship.overallSummary?.cost || detailScholarship.coverage}
                </div>
              </div>

              <div className={styles.detailSectionCard}>
                <div className={styles.detailSectionHeader}>
                  <span>🎁</span> সুযোগ-সুবিধা ও লিভিং ভাতা (Benefits & Living Support)
                </div>
                <div className={styles.detailSectionBody}>
                  {detailScholarship.overallSummary?.benefits ||
                    "মাসিক লিভিং এলাউন্স ও প্রয়োজনীয় শিক্ষা সহায়তা নিয়মাবলী অনুযায়ী প্রযোজ্য।"}
                </div>
              </div>

              <div className={styles.detailSectionCard}>
                <div className={styles.detailSectionHeader}>
                  <span>📋</span> যোগ্যতা ও আবেদন শর্তাবলী (Eligibility & Academic Criteria)
                </div>
                <div className={styles.detailSectionBody}>
                  {detailScholarship.overallSummary?.other ||
                    "আবেদনকারীর একাডেমিক ফলাফল এবং সংশ্লিষ্ট ভাষা দক্ষতা (আইইএলটিএস/টিওএফএল বা মিডিয়াম অফ ইন্সট্রাকশন) প্রয়োজন।"}
                </div>
              </div>

              {/* BD Student Perspective */}
              {activeBrief && (
                <div className={styles.detailSectionCard} style={{ borderLeft: "3px solid #10B981" }}>
                  <div className={styles.detailSectionHeader} style={{ color: "#10B981" }}>
                    <span>🇧🇩</span> বাংলাদেশি শিক্ষার্থীদের জন্য পরামর্শ (BD Perspective)
                  </div>
                  <div className={styles.detailSectionBody}>
                    {activeBrief.successTip} (ঢাকায় ভিসা প্রসেসিং: {activeBrief.visaDhaka})
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.detailActions}>
              <button className={styles.actionBtn} onClick={() => setDetailScholarship(null)}>
                Close
              </button>
              <a
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                href={detailScholarship.officialSource}
                target="_blank"
                rel="noreferrer"
              >
                Official Application Portal ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Match My Profile Modal */}
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
                  <option value="500000">৫ - ১০ লাখ টাকা (টিউশন ওয়েভার)</option>
                  <option value="1500000">১৫ - ২৫ লাখ টাকা (আংশিক ওয়েভার)</option>
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
                  setShowOnlyMatching(true);
                  setIsProfileModalOpen(false);
                }}
              >
                Apply to Map ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Download / Social Export Card Modal with Featured Scholarship Picker */}
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
              আপনার নির্বাচিত গন্তব্য ও পছন্দের স্কলারশিপের সারসংক্ষেপ দিয়ে তৈরি প্রফেশনাল ম্যাপ কার্ড। সোশ্যাল মিডিয়ায় শেয়ার করুন!
            </p>

            <div className={styles.formGrid} style={{ marginBottom: "14px" }}>
              <div className={styles.formGroup}>
                <label>আপনার নাম (Name on Map):</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    updateExportCard(e.target.value, featuredScholarshipId);
                  }}
                  placeholder="যেমন: Tahmid"
                />
              </div>

              <div className={styles.formGroup}>
                <label>পছন্দের টার্গেট স্কলারশিপ (Featured Award):</label>
                <select
                  value={featuredScholarshipId}
                  onChange={(e) => {
                    setFeaturedScholarshipId(e.target.value);
                    updateExportCard(studentName, e.target.value);
                  }}
                >
                  <option value="none">সাধারণ ওভারভিউ (General Blueprint)</option>
                  {activeGeo && (
                    <optgroup label={`🎯 ${activeGeo.countryEn} এর স্কলারশিপসমূহ:`}>
                      {activeGeo.items.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.fundingTier === "fully_funded" ? "Fully Funded" : "Tuition Waiver"})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="🌟 শীর্ষ গ্লোবাল স্কলারশিপসমূহ:">
                    <option value="BD-014">[জার্মানি] DAAD Helmut-Schmidt Programme</option>
                    <option value="BD-036">[হাঙ্গেরি] Stipendium Hungaricum Scholarship</option>
                    <option value="BD-006">[যুক্তরাজ্য] Commonwealth Master&apos;s Scholarship</option>
                    <option value="BD-007">[যুক্তরাজ্য] Chevening Scholarship</option>
                    <option value="BD-001">[যুক্তরাষ্ট্র] Fulbright Foreign Student Program</option>
                    <option value="BD-028">[জাপান] MEXT Japanese Government Scholarship</option>
                    <option value="BD-034">[তুরস্ক] Türkiye Bursları Scholarship</option>
                    <option value="BD-030">[চীন] Chinese Government Scholarship (CSC)</option>
                    <option value="BD-031">[দক্ষিণ কোরিয়া] Global Korea Scholarship (GKS)</option>
                    <option value="BD-044">[সুইডেন] Swedish Institute Scholarships for Global Professionals</option>
                  </optgroup>
                </select>
              </div>
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
