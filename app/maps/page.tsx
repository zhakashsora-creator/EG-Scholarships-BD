"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import styles from "./maps.module.css";
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
  { iso: "RUS", name: "রাশিয়া", flag: "🇷🇺" },
  { iso: "SAU", name: "সৌদি আরব", flag: "🇸🇦" },
  { iso: "ARE", name: "সংযুক্ত আরব আমিরাত", flag: "🇦🇪" },
  { iso: "QAT", name: "কাতার", flag: "🇶🇦" },
  { iso: "SGP", name: "সিঙ্গাপুর", flag: "🇸🇬" },
  { iso: "TUR", name: "তুরস্ক", flag: "🇹🇷" },
  { iso: "CHN", name: "চীন", flag: "🇨🇳" },
  { iso: "HKG", name: "হংকং", flag: "🇭🇰" },
  { iso: "KAZ", name: "কাজাখস্তান", flag: "🇰🇿" },
  { iso: "KGZ", name: "কিরগিজস্তান", flag: "🇰🇬" },
  { iso: "AZE", name: "আজারবাইজান", flag: "🇦🇿" },
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

export default function GlobalStudyMapsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // App State
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("midnight");
  const [activeMode, setActiveMode] = useState<"scholarships" | "universities" | "top100">("scholarships");

  // Global Funding Filter State
  const [fundingFilter, setFundingFilter] = useState<"all" | "fully_funded" | "full_tuition" | "partial">("all");

  // Zoom State
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Drag / Pan State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

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
    renderer.setGeoIndexData(geoIndex);
    renderer.setFundingFilter(fundingFilter);
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

  // Sync global funding filter with map engine
  const handleFundingFilterChange = (filter: "all" | "fully_funded" | "full_tuition" | "partial") => {
    setFundingFilter(filter);
    if (rendererRef.current) {
      rendererRef.current.setFundingFilter(filter);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (!rendererRef.current) return;
    const z = rendererRef.current.zoomIn();
    setZoomPercent(z);
  };

  const handleZoomOut = () => {
    if (!rendererRef.current) return;
    const z = rendererRef.current.zoomOut();
    setZoomPercent(z);
  };

  const handleResetZoom = () => {
    if (!rendererRef.current) return;
    const z = rendererRef.current.resetZoom();
    setZoomPercent(z);
  };

  // Mouse wheel zoom
  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!rendererRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;
    if (e.deltaY < 0) {
      const z = rendererRef.current.zoomIn(1.15, [focalX, focalY]);
      setZoomPercent(z);
    } else {
      const z = rendererRef.current.zoomOut(1.15, [focalX, focalY]);
      setZoomPercent(z);
    }
  };

  // Drag-to-pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;
      setIsDragging(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && dragStartRef.current && rendererRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
        rendererRef.current.pan(dx, dy);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    if (!rendererRef.current) return;
    const { country, university, isHome } = rendererRef.current.hitTest(e.clientX, e.clientY);

    setIsHoveredHome(isHome);
    setHoveredUniversity(university);
    setHoveredCountry(country);

    rendererRef.current.hoveredCountry = country?.i || null;
    rendererRef.current.hoveredUniversity = university;
    rendererRef.current.render();
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleCanvasMouseLeave = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (!rendererRef.current) return;
    setIsHoveredHome(false);
    setHoveredCountry(null);
    setHoveredUniversity(null);
    rendererRef.current.hoveredCountry = null;
    rendererRef.current.hoveredUniversity = null;
    rendererRef.current.render();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    if (!rendererRef.current) return;
    const { country, isHome } = rendererRef.current.hitTest(e.clientX, e.clientY);

    if (isHome) return;

    if (country) {
      if (country.i === "BGD") return;
      const nextIso = selectedIso === country.i ? null : country.i;
      setSelectedIso(nextIso);
      setDetailScholarship(null);
      rendererRef.current.selectCountry(country.i);
    }
  };

  const handleSelectCountry = (iso: string) => {
    if (iso === "BGD") return;
    const nextIso = selectedIso === iso ? null : iso;
    setSelectedIso(nextIso);
    setDetailScholarship(null);
    if (rendererRef.current) {
      rendererRef.current.selectCountry(iso);
    }
  };

  const handleClearSelection = () => {
    setSelectedIso(null);
    setDetailScholarship(null);
    if (rendererRef.current) {
      rendererRef.current.clearSelection();
    }
  };

  // Country Info Resolution
  const selectedFeature = worldData?.f.find((x) => x.i === selectedIso) || null;
  const activeGeo = selectedIso ? geoIndex[selectedIso] : null;
  const activeBrief = selectedIso ? countryBriefs[selectedIso] : null;

  const countryNameEn = activeBrief?.nameEn || selectedFeature?.n || selectedIso || "";
  const countryNameBn = activeBrief?.nameBn || selectedFeature?.b || "";
  const countryFlag = activeBrief?.flag || "🌍";

  const activeUniversities = useMemo(() => {
    if (!selectedIso) return [];
    return universities.filter((u) => u.iso === selectedIso);
  }, [selectedIso]);

  // Filter scholarships by global funding filter
  const tierFilteredItems = useMemo(() => {
    if (!activeGeo) return [];
    if (fundingFilter === "all") return activeGeo.items;
    return activeGeo.items.filter((item) => item.fundingTier === fundingFilter);
  }, [activeGeo, fundingFilter]);

  // Profile matching filter applied over tier filtered items
  const matchingItems = useMemo(() => {
    if (!isProfileMatchingActive) return tierFilteredItems;
    const cgpaVal = parseFloat(profileCgpa) || 3.0;
    const ieltsVal = parseFloat(profileIelts) || 6.0;

    return tierFilteredItems.filter((item) =>
      isScholarshipMatch(item, profileLevel, cgpaVal, ieltsVal, profileBudget)
    );
  }, [tierFilteredItems, isProfileMatchingActive, profileLevel, profileCgpa, profileIelts, profileBudget]);

  const displayedScholarships = useMemo(() => {
    if (!isProfileMatchingActive) return tierFilteredItems;
    if (showOnlyMatching) return matchingItems;
    return tierFilteredItems;
  }, [isProfileMatchingActive, showOnlyMatching, matchingItems, tierFilteredItems]);

  // HUD Data
  const hudTarget = hoveredCountry || (selectedIso ? worldData?.f.find((x) => x.i === selectedIso) : null);
  const hudBrief = hudTarget ? countryBriefs[hudTarget.i] : null;
  const hudGeo = hudTarget ? geoIndex[hudTarget.i] : null;

  // Handle Opening Social Export Modal
  const handleOpenExportModal = () => {
    if (!rendererRef.current) return;
    let featuredObj: { name: string; country: string; coverage: string; studyLevel?: string } | undefined;
    const targetItem =
      (featuredScholarshipId !== "none" && activeGeo?.items.find((item) => item.id === featuredScholarshipId)) ||
      detailScholarship ||
      (activeGeo && activeGeo.items.length > 0 ? activeGeo.items[0] : null);

    if (targetItem) {
      featuredObj = {
        name: targetItem.name,
        country: activeGeo?.countryEn || countryNameEn,
        coverage: targetItem.coverage || "Full Tuition",
        studyLevel: targetItem.studyLevel,
      };
      setFeaturedScholarshipId(targetItem.id);
    }

    const card = rendererRef.current.generateExportCard({
      studentName: studentName || "Tahmid",
      targetIntake: "2026/27 Intake",
      totalScholarshipsCount: activeGeo?.totalCount || 635,
      totalUnivCount: activeUniversities.length || 100,
      featuredScholarship: featuredObj,
    });
    setExportCardUrl(card);
    setIsExportModalOpen(true);
  };

  // Quick Export & Share Single Featured Scholarship to Socials
  const handleShareScholarship = (item: ScholarshipItem) => {
    setFeaturedScholarshipId(item.id);
    if (!rendererRef.current) return;
    const featuredObj = {
      name: item.name,
      country: activeGeo?.countryEn || countryNameEn,
      coverage: item.coverage || "Full Tuition",
      studyLevel: item.studyLevel,
    };
    const card = rendererRef.current.generateExportCard({
      studentName: studentName || "Tahmid",
      targetIntake: "2026/27 Intake",
      totalScholarshipsCount: activeGeo?.totalCount || 635,
      totalUnivCount: activeUniversities.length || 100,
      featuredScholarship: featuredObj,
    });
    setExportCardUrl(card);
    setIsExportModalOpen(true);
  };

  const handleRefreshExportCard = (chosenId: string) => {
    if (!rendererRef.current) return;
    let featuredObj: { name: string; country: string; coverage: string; studyLevel?: string } | undefined;
    if (chosenId !== "none" && activeGeo) {
      const found = activeGeo.items.find((item) => item.id === chosenId);
      if (found) {
        featuredObj = {
          name: found.name,
          country: activeGeo.countryEn,
          coverage: found.coverage || "Full Tuition",
          studyLevel: found.studyLevel,
        };
      }
    } else if (activeGeo && activeGeo.items.length > 0) {
      const topOne = activeGeo.items[0];
      featuredObj = {
        name: topOne.name,
        country: activeGeo.countryEn,
        coverage: topOne.coverage || "Full Tuition",
        studyLevel: topOne.studyLevel,
      };
    }

    const card = rendererRef.current.generateExportCard({
      studentName: studentName || "Tahmid",
      targetIntake: "2026/27 Intake",
      totalScholarshipsCount: activeGeo?.totalCount || 635,
      totalUnivCount: activeUniversities.length || 100,
      featuredScholarship: featuredObj,
    });
    setExportCardUrl(card);
  };

  return (
    <div className={styles.compassShell}>
      {/* 1. Header Navigation */}
      <header className={styles.navHeader}>
        <div className={styles.brandWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/egc-emblem.png" alt="EG Emblem" className={styles.brandLogo} />
          <div>
            <div className={styles.brandTitle}>
              EG Global Study Maps
              <span className={styles.brandBadge}>Interactive</span>
            </div>
            <div className={styles.brandSub}>
              &ldquo;Study abroad with a plan, not confusion.&rdquo; — Excellence Global
            </div>
          </div>
        </div>

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
              <strong>বাংলাদেশ (BD) — হোম লোকেশন</strong>
              <span>উচ্চশিক্ষার লক্ষ্য হিসেবে বিশ্বের যেকোনো গন্তব্য দেশ ক্লিক করুন (BD Origin) ↗</span>
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
                <strong>স্বাগতম EG Global Study Maps-এ!</strong> মানচিত্রের যেকোনো দেশে ক্লিক করে স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয় এক্সপ্লোর করুন।
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
          {/* Mode Tabs & Selection Pill */}
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
                <span>🎯 {countryNameEn || selectedIso} Selected</span>
                <button className={styles.clearBtn} onClick={handleClearSelection} title="Deselect country">
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Global Funding Filter Bar */}
          <div className={styles.fundingFilterBar}>
            <span className={styles.fundingFilterLabel}>
              <span>💰</span> ফান্ডিং ফিল্টার:
            </span>
            <div className={styles.fundingFilterPills}>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "all" ? styles.fundingFilterPillActive : ""}`}
                onClick={() => handleFundingFilterChange("all")}
              >
                All (সব ফান্ডিং)
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "fully_funded" ? styles.fundingFilterPillGreenActive : ""}`}
                onClick={() => handleFundingFilterChange("fully_funded")}
              >
                🟢 Fully Funded (সম্পূর্ণ ফান্ডেড)
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "full_tuition" ? styles.fundingFilterPillBlueActive : ""}`}
                onClick={() => handleFundingFilterChange("full_tuition")}
              >
                🔵 100% Tuition (টিউশন ফ্রি)
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "partial" ? styles.fundingFilterPillAmberActive : ""}`}
                onClick={() => handleFundingFilterChange("partial")}
              >
                🟡 Partial (আংশিক স্কলারশিপ)
              </button>
            </div>
          </div>

          {/* HTML5 Canvas Container with Zoom Controls Overlay */}
          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              className={styles.mapCanvas}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              onWheel={handleCanvasWheel}
              onClick={handleCanvasClick}
            />

            {/* Interactive Zoom Controls */}
            <div className={styles.zoomControls}>
              <button className={styles.zoomBtn} onClick={handleZoomIn} title="Zoom In (+)">
                +
              </button>
              <span className={styles.zoomBadge}>{zoomPercent}%</span>
              <button className={styles.zoomBtn} onClick={handleZoomOut} title="Zoom Out (−)">
                −
              </button>
              <button
                className={styles.zoomBtn}
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{ fontSize: "0.85rem" }}
              >
                ⟲
              </button>
            </div>

            {/* Floating Scholarship Details Pop-Up Window on the Map */}
            {detailScholarship && (
              <div
                className={styles.floatingDetailWindow}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Scholarship Details"
              >
                <div className={styles.floatingDetailHeader}>
                  <div className={styles.floatingHeaderTop}>
                    <div className={styles.floatingHeaderBadges}>
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
                          ? "🟢 Fully Funded"
                          : detailScholarship.fundingTier === "full_tuition"
                          ? "🔵 100% Tuition Waiver"
                          : "🟡 Partial Scholarship"}
                      </span>
                      <span className={styles.floatingCountryBadge}>
                        {countryFlag} {countryNameEn} {countryNameBn ? `(${countryNameBn})` : ""}
                      </span>
                    </div>
                    <button
                      className={styles.floatingCloseBtn}
                      onClick={() => setDetailScholarship(null)}
                      aria-label="Close details"
                      title="Close window"
                    >
                      ✕
                    </button>
                  </div>
                  <h3 className={styles.floatingTitle}>{detailScholarship.name}</h3>
                  <div className={styles.floatingProvider}>
                    🏛️ {detailScholarship.provider}
                  </div>
                </div>

                <div className={styles.floatingDetailBody}>
                  {detailScholarship.overallSummary ? (
                    <>
                      <div className={styles.floatingSectionCard}>
                        <div className={styles.floatingSectionHeader}>
                          <span>🏷️</span> খরচ ও টিউশন ফি (Cost & Tuition)
                        </div>
                        <p className={styles.floatingSectionText}>{detailScholarship.overallSummary.cost}</p>
                      </div>

                      <div className={styles.floatingSectionCard}>
                        <div className={styles.floatingSectionHeader}>
                          <span>💰</span> সুবিধা ও আবাসন ভাতা (Benefits & Living)
                        </div>
                        <p className={styles.floatingSectionText}>{detailScholarship.overallSummary.benefits}</p>
                      </div>

                      <div className={styles.floatingSectionCard}>
                        <div className={styles.floatingSectionHeader}>
                          <span>📋</span> যোগ্যতা ও আবেদন প্রক্রিয়া (Eligibility & Strategy)
                        </div>
                        <p className={styles.floatingSectionText}>{detailScholarship.overallSummary.other}</p>
                      </div>
                    </>
                  ) : (
                    <div className={styles.floatingSectionCard}>
                      <div className={styles.floatingSectionHeader}>
                        <span>💰</span> স্কলারশিপ কাভারেজ
                      </div>
                      <p className={styles.floatingSectionText}>
                        {detailScholarship.coverage || "ফান্ডিং ও স্কলারশিপের বিবরণ অফিসিয়াল পোর্টালে বিস্তারিত রয়েছে।"}
                      </p>
                    </div>
                  )}

                  <div className={styles.floatingMetaGrid}>
                    <div className={styles.floatingMetaItem}>
                      <b>🎓 প্রোগ্রাম:</b> {detailScholarship.studyLevel || "সকল প্রোগ্রাম"}
                    </div>
                    <div className={styles.floatingMetaItem}>
                      <b>📅 ডেডলাইন:</b> {detailScholarship.deadline || "Upcoming Intake"}
                    </div>
                    <div className={styles.floatingMetaItem}>
                      <b>🔍 স্ট্যাটাস:</b> {detailScholarship.status || "Active / Verified"}
                    </div>
                    <div className={styles.floatingMetaItem}>
                      <b>🛡️ পরামর্শ:</b> EG Research Desk
                    </div>
                  </div>
                </div>

                <div className={styles.floatingDetailFooter}>
                  <button
                    className={styles.floatingShareBtn}
                    onClick={() => handleShareScholarship(detailScholarship)}
                    title="Export / Share this scholarship card to socials"
                  >
                    <span>📸</span> সোশ্যালে শেয়ার (Share Card)
                  </button>
                  <a
                    className={styles.floatingSourceBtn}
                    href={detailScholarship.officialSource}
                    target="_blank"
                    rel="noreferrer"
                    title="Visit official portal"
                  >
                    <span>🌐</span> অফিসিয়াল পোর্টাল ↗
                  </a>
                  <button
                    className={styles.floatingDismissBtn}
                    onClick={() => setDetailScholarship(null)}
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Map Legend */}
          <footer className={styles.mapFooter}>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#059669" }}></span>
                <span>🇧🇩 BD</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#F5B041" }}></span>
                <span>Selected Destination</span>
              </div>
              {fundingFilter !== "all" ? (
                <div className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{
                      background:
                        fundingFilter === "fully_funded"
                          ? "#10B981"
                          : fundingFilter === "full_tuition"
                          ? "#38BDF8"
                          : "#F59E0B",
                    }}
                  ></span>
                  <span>
                    {fundingFilter === "fully_funded"
                      ? "Offers Fully Funded Awards"
                      : fundingFilter === "full_tuition"
                      ? "Offers Full Tuition Waivers"
                      : "Offers Partial Awards"}
                  </span>
                </div>
              ) : isProfileMatchingActive ? (
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
              ) : null}
            </div>

            <div style={{ color: "#94A3B8" }}>
              Click country to view details • Scroll / Drag to zoom & pan • Click again to deselect
            </div>
          </footer>
        </div>

        {/* Right Column: Sliding Window Panel */}
        <aside className={styles.windowPanel}>
          {selectedIso ? (
            <>
              {/* Country Hero Header */}
              <header className={styles.panelHeader}>
                <div className={styles.countryHero}>
                  <span className={styles.heroFlag}>{countryFlag}</span>
                  <div>
                    <div className={styles.heroTitle}>
                      {countryNameEn}
                      {countryNameBn && <small className={styles.heroBn}>({countryNameBn})</small>}
                    </div>
                    <div className={styles.heroSub}>
                      {activeBrief?.continent || selectedFeature?.ct?.toUpperCase() || "Global Hub"} • Capital: {activeBrief?.capital || "National Capital"} • {activeGeo?.totalCount || 0} Aggregated Awards
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
                    {/* Check if Selected Country has 0 Indexed Scholarships */}
                    {!activeGeo || activeGeo.totalCount === 0 ? (
                      <div className={styles.emptyCountryCard}>
                        <div className={styles.emptyBadge}>
                          <span>ℹ️</span> স্কলারশিপ তালিকাভুক্তির তথ্য
                        </div>
                        <h3 className={styles.emptyTitle}>
                          বর্তমানে {countryNameEn} {countryNameBn ? `(${countryNameBn})` : ""}-এ বাংলাদেশি শিক্ষার্থীদের জন্য কোনো সক্রিয় স্কলারশিপ তালিকাভুক্ত নেই
                        </h3>
                        <p className={styles.emptyText}>
                          Excellence Global নিয়মিত বাংলাদেশ শিক্ষা মন্ত্রণালয় (MoE), সংশ্লিষ্ট দেশের দূতাবাস এবং আন্তর্জাতিক শিক্ষাবোর্ডসমূহের দ্বিপাক্ষিক সার্কুলার পর্যবেক্ষণ করে। নতুন কোনো সরকারি চুক্তি বা প্রাতিষ্ঠানিক সুযোগ উন্মুক্ত হলে আমাদের ডাটাবেজে তাৎক্ষণিকভাবে হালনাগাদ করা হবে।
                        </p>

                        <div className={styles.emptyGuidanceBox}>
                          <div className={styles.emptyGuidanceTitle}>
                            <span>🏛️</span> সেলফ-ফান্ডেড ও সরাসরি আবেদন
                          </div>
                          <p className={styles.emptyGuidanceText}>
                            যদি আপনি এই দেশে স্ব-অর্থায়নে পড়তে আগ্রহী হন, তবে ইউনিভার্সিটির অফিসিয়াল ওয়েবসাইটে আন্তর্জাতিক টিউশন ফি, ন্যূনতম আইইএলটিএস এবং অ্যাডমিশন ডেটলাইন যাচাই করুন।
                          </p>
                        </div>

                        <div className={styles.emptyGuidanceBox}>
                          <div className={styles.emptyGuidanceTitle}>
                            <span>🌍</span> জনপ্রিয় বিকল্প স্কলারশিপ গন্তব্য
                          </div>
                          <p className={styles.emptyGuidanceText}>
                            বাংলাদেশি শিক্ষার্থীদের জন্য শতাধিক সক্রিয় স্কলারশিপ চালু থাকা কয়েকটি শীর্ষ গন্তব্য:
                          </p>
                          <div className={styles.emptyChipsWrap}>
                            {POPULAR_DESTINATIONS.slice(0, 8).map((dest) => (
                              <button
                                key={dest.iso}
                                className={styles.emptyChip}
                                onClick={() => handleSelectCountry(dest.iso)}
                              >
                                {dest.flag} {dest.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <a
                          className={styles.emptyCtaBtn}
                          href="https://wa.me/8801601247111"
                          target="_blank"
                          rel="noreferrer"
                        >
                          💬 ফ্রি প্রোফাইল মূল্যায়ন (হোয়াটসঅ্যাপ কনসাল্টেশন) →
                        </a>
                      </div>
                    ) : (
                      <>
                        {/* Scholarship Profile Matching Filter Ribbon */}
                        {isProfileMatchingActive && (
                          <div className={styles.matchBanner}>
                            <div className={styles.matchBannerTop}>
                              <span className={styles.matchBannerText}>
                                🎯 প্রোফাইল ফিল্টার সক্রিয়: {showOnlyMatching ? `ম্যাচিং স্কলারশিপ (${matchingItems.length})` : `সব স্কলারশিপ (${tierFilteredItems.length})`}
                              </span>
                              <button
                                className={styles.matchToggleBtn}
                                onClick={() => setShowOnlyMatching((prev) => !prev)}
                              >
                                {showOnlyMatching ? `সব দেখুন (${tierFilteredItems.length})` : `শুধু ম্যাচিং (${matchingItems.length})`}
                              </button>
                            </div>
                            <small style={{ color: "#CBD5E1", fontSize: "0.72rem" }}>
                              যোগ্যতা: {profileLevel} · CGPA {profileCgpa} · IELTS {profileIelts} · {profileBudget === "0" ? "১০০% ফ্রি/ফুললি ফান্ডেড" : `বাজেট ${profileBudget} BDT`}
                            </small>
                          </div>
                        )}

                        <div className={styles.sectionTitle}>
                          <span>
                            স্কলারশিপ ও অনুদান ({displayedScholarships.length})
                            {fundingFilter !== "all" && (
                              <span style={{ color: "#F5B041", fontSize: "0.75rem", marginLeft: 6 }}>
                                [
                                {fundingFilter === "fully_funded"
                                  ? "Fully Funded"
                                  : fundingFilter === "full_tuition"
                                  ? "100% Tuition"
                                  : "Partial"}
                                ]
                              </span>
                            )}
                          </span>
                          <small>EG Verified Database</small>
                        </div>

                        {/* Check if funding filter or profile filter produces 0 items */}
                        {displayedScholarships.length === 0 ? (
                          <div className={styles.noMatchNotice}>
                            <div>
                              🔍 বর্তমান ফিল্টারের সাথে এই দেশের কোনো স্কলারশিপ মিলছে না।
                              {fundingFilter !== "all" && (
                                <div style={{ marginTop: 4, fontSize: "0.78rem" }}>
                                  (এই দেশে মোট {activeGeo.totalCount}টি স্কলারশিপ তালিকাভুক্ত রয়েছে)
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              {fundingFilter !== "all" && (
                                <button
                                  className={styles.matchToggleBtn}
                                  onClick={() => handleFundingFilterChange("all")}
                                >
                                  ফান্ডিং ফিল্টার রিসেট করুন
                                </button>
                              )}
                              {isProfileMatchingActive && showOnlyMatching && (
                                <button
                                  className={styles.matchToggleBtn}
                                  onClick={() => setShowOnlyMatching(false)}
                                >
                                  সব দেখুন ({tierFilteredItems.length})
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          displayedScholarships.map((s) => (
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
                  </>
                )}
              </div>
            </>
          ) : (
            /* Welcome & Onboarding View When No Country is Selected */
            <div className={styles.welcomeWrap}>
              <div className={styles.welcomeHero}>
                <span className={styles.welcomeHeroBadge}>✨ Global Study Maps</span>
                <h1 className={styles.welcomeHeroTitle}>গ্লোবাল স্টাডি ম্যাপস</h1>
                <p className={styles.welcomeHeroSub}>
                  বাংলাদেশি শিক্ষার্থীদের জন্য ৭৮+ দেশের স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয়ের সমন্বিত ইন্টারেক্টিভ মানচিত্র।
                </p>
                <div className={styles.welcomeHeroMotto}>
                  &ldquo;Study abroad with a plan, not confusion.&rdquo; — Excellence Global
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className={styles.welcomeStatsGrid}>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>৬৩৫+</span>
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
                  <span>🚀</span> কীভাবে ব্যবহার করবেন (৩টি সহজ ধাপ)
                </div>
                <div className={styles.welcomeSteps}>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>১</div>
                    <div className={styles.stepText}>
                      <strong>মানচিত্রের যেকোনো দেশে ক্লিক করুন:</strong> ফ্লাইটের রুট আঁকা হবে এবং ডানপাশের প্যানেলে তাৎক্ষণিকভাবে টিউশন ফি ও লিভিং কস্ট দেখতে পাবেন।
                    </div>
                  </div>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>২</div>
                    <div className={styles.stepText}>
                      <strong>ফান্ডিং ফিল্টার বা ম্যাচ মাই প্রোফাইল সেট করুন:</strong> আপনার বাজেট ও যোগ্যতার স্কলারশিপগুলো এক ক্লিকে ফিল্টার করুন।
                    </div>
                  </div>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>৩</div>
                    <div className={styles.stepText}>
                      <strong>View Details বা Download Map চাপুন:</strong> প্রতিটি বৃত্তির সম্পূর্ণ বিস্তারিত তথ্য দেখুন অথবা বন্ধুদের সাথে শেয়ার করতে হাই-রেজ ব্লুপ্রিন্ট কার্ড ডাউনলোড করুন।
                    </div>
                  </div>
                </div>
              </div>

              {/* Popular Study Destinations Quick Chips */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeSectionTitle}>
                  <span>🌟</span> জনপ্রিয় স্টাডি ডেস্টিনেশন (এক ক্লিকে দেখুন)
                </div>
                <div className={styles.quickChips}>
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <button
                      key={dest.iso}
                      className={styles.quickChip}
                      onClick={() => handleSelectCountry(dest.iso)}
                    >
                      <span>{dest.flag}</span>
                      <span>{dest.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>


      {/* =========================================================================
          MODAL 2: Match My Profile (Personalized Profile Filter)
          ========================================================================= */}
      {isProfileModalOpen && (
        <div className={styles.detailModalOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={styles.detailModalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <div>
                <h2 className={styles.detailModalTitle}>🎯 আপনার প্রোফাইল অনুসারে স্কলারশিপ ম্যাচিং</h2>
                <div className={styles.detailModalProvider}>
                  আপনার বর্তমান রেজাল্ট ও বাজেট প্রদান করুন; মানচিত্রে যোগ্য দেশগুলো হাইলাইট করা হবে।
                </div>
              </div>
              <button
                className={styles.detailModalClose}
                onClick={() => setIsProfileModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.detailModalBody}>
              <div className={styles.profileInputGroup}>
                <label className={styles.profileLabel}>🎓 টার্গেট স্টাডি লেভেল</label>
                <select
                  className={styles.profileSelect}
                  value={profileLevel}
                  onChange={(e) => setProfileLevel(e.target.value)}
                >
                  <option value="Bachelor">Bachelor / Undergraduate (স্নাতক)</option>
                  <option value="Master">Master&apos;s Degree (স্নাতকোত্তর)</option>
                  <option value="PhD">PhD / Doctoral Research (ডক্টরেট)</option>
                </select>
              </div>

              <div className={styles.profileInputGroup}>
                <label className={styles.profileLabel}>📊 বর্তমান CGPA / GPA (স্কেল ৪.০ বা ৫.০)</label>
                <input
                  type="number"
                  step="0.05"
                  min="2.0"
                  max="5.0"
                  className={styles.profileInput}
                  value={profileCgpa}
                  onChange={(e) => setProfileCgpa(e.target.value)}
                  placeholder="3.30"
                />
              </div>

              <div className={styles.profileInputGroup}>
                <label className={styles.profileLabel}>🗣️ আইইএলটিএস স্কোর (IELTS Overall Band)</label>
                <input
                  type="number"
                  step="0.5"
                  min="4.0"
                  max="9.0"
                  className={styles.profileInput}
                  value={profileIelts}
                  onChange={(e) => setProfileIelts(e.target.value)}
                  placeholder="6.5"
                />
              </div>

              <div className={styles.profileInputGroup}>
                <label className={styles.profileLabel}>💰 আপনার বার্ষিক সর্বোচ্চ নিজস্ব বাজেট</label>
                <select
                  className={styles.profileSelect}
                  value={profileBudget}
                  onChange={(e) => setProfileBudget(e.target.value)}
                >
                  <option value="0">০৳ — ১০০% সম্পূর্ণ ফান্ডেড স্কলারশিপ প্রয়োজন</option>
                  <option value="500000">৫ - ১০ লক্ষ টাকা (টিউশন ওয়েভার কাভার্ড)</option>
                  <option value="1500000">১৫ - ২৫ লক্ষ টাকা (আংশিক স্কলারশিপ বা সেলফ ফান্ডেড)</option>
                </select>
              </div>
            </div>

            <div className={styles.detailModalFooter}>
              <button
                className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                onClick={() => {
                  setIsProfileMatchingActive(true);
                  setIsProfileModalOpen(false);
                }}
              >
                প্রোফাইল ম্যাচিং ফিল্টার প্রয়োগ করুন ✓
              </button>
              {isProfileMatchingActive && (
                <button
                  className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                  onClick={() => {
                    setIsProfileMatchingActive(false);
                    setIsProfileModalOpen(false);
                  }}
                >
                  ফিল্টার রিসেট করুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: Download My Map ("Show-Off" Card Generator)
          ========================================================================= */}
      {isExportModalOpen && (
        <div className={styles.detailModalOverlay} onClick={() => setIsExportModalOpen(false)}>
          <div className={styles.detailModalBox} style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <div>
                <h2 className={styles.detailModalTitle}>📸 আপনার গ্লোবাল স্টাডি ম্যাপ কার্ড ডাউনলোড করুন</h2>
                <div className={styles.detailModalProvider}>
                  সোশ্যাল মিডিয়া ও বন্ধুদের সাথে শেয়ার করার জন্য এক্সক্লুসিভ স্টাডি ব্লুপ্রিন্ট কার্ড।
                </div>
              </div>
              <button
                className={styles.detailModalClose}
                onClick={() => setIsExportModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.detailModalBody}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className={styles.profileInputGroup}>
                  <label className={styles.profileLabel}>👤 কার্ডে আপনার নাম</label>
                  <input
                    type="text"
                    className={styles.profileInput}
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                    }}
                    placeholder="আপনার নাম লিখুন"
                  />
                </div>

                {activeGeo && activeGeo.items.length > 0 && (
                  <div className={styles.profileInputGroup}>
                    <label className={styles.profileLabel}>🎯 কার্ডে প্রদর্শিত টার্গেট স্কলারশিপ</label>
                    <select
                      className={styles.profileSelect}
                      value={featuredScholarshipId}
                      onChange={(e) => {
                        setFeaturedScholarshipId(e.target.value);
                        handleRefreshExportCard(e.target.value);
                      }}
                    >
                      <option value="none">স্বয়ংক্রিয় শীর্ষ স্কলারশিপ নির্বাচন</option>
                      {activeGeo.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name.slice(0, 48)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {exportCardUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={exportCardUrl}
                  alt="My Global Study Blueprint Card"
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                  }}
                />
              ) : (
                <p>Generating card...</p>
              )}
            </div>

            <div className={styles.detailModalFooter}>
              {exportCardUrl && (
                <a
                  className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                  href={exportCardUrl}
                  download={`${studentName.toLowerCase().replace(/\s+/g, "-")}-study-blueprint.png`}
                >
                  কার্ড ডাউনলোড করুন (PNG) ⬇
                </a>
              )}
              <button
                className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                onClick={() => setIsExportModalOpen(false)}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
