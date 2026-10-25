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
  CONTINENTS,
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

// Clean SVG Icons for Professional Elite Consulting Appearance (Zero Emojis / Clip-arts)
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function GradCapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// Popular study abroad destinations for quick chips (Clean text only, ZERO flag emojis or CA/AU country codes)
const POPULAR_DESTINATIONS = [
  { iso: "DEU", nameBn: "জার্মানি", nameEn: "Germany" },
  { iso: "GBR", nameBn: "যুক্তরাজ্য", nameEn: "United Kingdom" },
  { iso: "USA", nameBn: "যুক্তরাষ্ট্র", nameEn: "United States" },
  { iso: "CAN", nameBn: "কানাডা", nameEn: "Canada" },
  { iso: "AUS", nameBn: "অস্ট্রেলিয়া", nameEn: "Australia" },
  { iso: "JPN", nameBn: "জাপান", nameEn: "Japan" },
  { iso: "ITA", nameBn: "ইতালি", nameEn: "Italy" },
  { iso: "HUN", nameBn: "হাঙ্গেরি", nameEn: "Hungary" },
  { iso: "SWE", nameBn: "সুইডেন", nameEn: "Sweden" },
  { iso: "MYS", nameBn: "মালয়েশিয়া", nameEn: "Malaysia" },
  { iso: "KOR", nameBn: "দক্ষিণ কোরিয়া", nameEn: "South Korea" },
  { iso: "RUS", nameBn: "রাশিয়া", nameEn: "Russia" },
  { iso: "SAU", nameBn: "সৌদি আরব", nameEn: "Saudi Arabia" },
  { iso: "ARE", nameBn: "সংযুক্ত আরব আমিরাত", nameEn: "UAE" },
  { iso: "QAT", nameBn: "কাতার", nameEn: "Qatar" },
  { iso: "SGP", nameBn: "সিঙ্গাপুর", nameEn: "Singapore" },
  { iso: "TUR", nameBn: "তুরস্ক", nameEn: "Turkey" },
  { iso: "CHN", nameBn: "চীন", nameEn: "China" },
  { iso: "HKG", nameBn: "হংকং", nameEn: "Hong Kong" },
  { iso: "KAZ", nameBn: "কাজাখস্তান", nameEn: "Kazakhstan" },
  { iso: "KGZ", nameBn: "কিরগিজস্তান", nameEn: "Kyrgyzstan" },
  { iso: "AZE", nameBn: "আজারবাইজান", nameEn: "Azerbaijan" },
];

/**
 * Generate a high-resolution, branded scholarship card image for direct download
 */
function generateScholarshipCardImage(
  item: ScholarshipItem,
  countryEn: string,
  countryBn: string,
  lang: "bn" | "en" = "bn"
): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Background gradient (Midnight Blue Corporate)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#16222F");
  bgGrad.addColorStop(1, "#0D1722");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer golden accent frame
  ctx.strokeStyle = "rgba(245, 176, 65, 0.45)";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Inner subtle border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // 2. Top Header Brand Bar
  ctx.fillStyle = "#1E2C3A";
  ctx.fillRect(36, 36, width - 72, 110);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.moveTo(36, 146);
  ctx.lineTo(width - 36, 146);
  ctx.stroke();

  // Brand Name & Motto
  ctx.fillStyle = "#F5B041";
  ctx.font = "bold 26px Montserrat, Inter, system-ui, sans-serif";
  ctx.fillText("EXCELLENCE GLOBAL CONSULTANCY", 70, 85);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "16px Inter, system-ui, sans-serif";
  ctx.fillText("EG Scholarships Directory • Evidence, not promises.", 70, 118);

  // Top Right Verified Badge
  ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(width - 360, 62, 290, 48, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#34D399";
  ctx.font = "bold 15px Inter, system-ui, sans-serif";
  ctx.fillText("EG RESEARCH DESK VERIFIED", width - 338, 92);

  // 3. Country & Destination Badge
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 22px Inter, system-ui, sans-serif";
  const destText = countryBn ? `${countryEn.toUpperCase()} (${countryBn})` : countryEn.toUpperCase();
  ctx.fillText(`DESTINATION: ${destText}`, 70, 200);

  // 4. Funding Tier Badge
  let tierText = "PARTIAL SCHOLARSHIP";
  let tierColor = "#F59E0B";
  let tierBg = "rgba(245, 158, 11, 0.15)";
  if (item.fundingTier === "fully_funded") {
    tierText = "FULLY FUNDED SCHOLARSHIP";
    tierColor = "#10B981";
    tierBg = "rgba(16, 185, 129, 0.2)";
  } else if (item.fundingTier === "full_tuition") {
    tierText = "100% TUITION WAIVER";
    tierColor = "#38BDF8";
    tierBg = "rgba(56, 189, 248, 0.2)";
  }

  ctx.fillStyle = tierBg;
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(70, 225, 340, 42, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = tierColor;
  ctx.font = "bold 16px Inter, system-ui, sans-serif";
  ctx.fillText(tierText, 90, 252);

  // 5. Scholarship Name (Word-wrapped)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px Montserrat, Inter, system-ui, sans-serif";
  let currentY = 320;
  const words = item.name.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > width - 150 && n > 0) {
      ctx.fillText(line, 70, currentY);
      line = words[n] + " ";
      currentY += 46;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 70, currentY);
  currentY += 40;

  // Provider / Institution
  ctx.fillStyle = "#F5B041";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  ctx.fillText(`Provider: ${item.provider}`, 70, currentY);
  currentY += 45;

  // 6. Meta Specifications Bar (Program, Deadline, Status)
  ctx.fillStyle = "#1E2C3A";
  ctx.beginPath();
  ctx.roundRect(70, currentY, width - 140, 70, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.fillText("PROGRAM LEVEL", 95, currentY + 28);
  ctx.fillText("DEADLINE", 460, currentY + 28);
  ctx.fillText("AWARD STATUS", 820, currentY + 28);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 17px Inter, system-ui, sans-serif";
  ctx.fillText((item.studyLevel || "All Levels").slice(0, 32), 95, currentY + 54);
  ctx.fillText((item.deadline || "Upcoming Intake").slice(0, 28), 460, currentY + 54);
  ctx.fillText((item.status || "Active Verified").slice(0, 24), 820, currentY + 54);

  currentY += 95;

  // Helper for structured detail card boxes
  const drawDetailCard = (title: string, content: string, yPos: number, cardHeight: number) => {
    ctx.fillStyle = "rgba(30, 44, 58, 0.85)";
    ctx.beginPath();
    ctx.roundRect(70, yPos, width - 140, cardHeight, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 176, 65, 0.25)";
    ctx.stroke();

    // Card Title Header
    ctx.fillStyle = "#F5B041";
    ctx.font = "bold 17px Montserrat, Inter, system-ui, sans-serif";
    ctx.fillText(title.toUpperCase(), 95, yPos + 32);

    // Card Body text (wrapped)
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "18px Inter, system-ui, sans-serif";
    const cWords = content.split(" ");
    let cLine = "";
    let cY = yPos + 64;
    for (let i = 0; i < cWords.length; i++) {
      const test = cLine + cWords[i] + " ";
      if (ctx.measureText(test).width > width - 200 && i > 0) {
        ctx.fillText(cLine, 95, cY);
        cLine = cWords[i] + " ";
        cY += 28;
        if (cY > yPos + cardHeight - 15) break;
      } else {
        cLine = test;
      }
    }
    if (cY <= yPos + cardHeight - 15) {
      ctx.fillText(cLine, 95, cY);
    }
  };

  // 7. Three detail section cards
  const costText = item.overallSummary?.cost || "Tuition fee exemption and statutory allowances specified by governing regulations.";
  const benefitText = item.overallSummary?.benefits || item.coverage || "Includes tuition grant, living support stipends, and academic allowance.";
  const eligText = item.overallSummary?.other || "Admissions to recognized degree program, English proficiency credentials, and merit evaluation.";

  drawDetailCard(lang === "bn" ? "খরচ ও টিউশন ফি (COST & TUITION)" : "COST & TUITION", costText, currentY, 130);
  currentY += 145;

  drawDetailCard(lang === "bn" ? "সুবিধা ও আবাসন ভাতা (BENEFITS & LIVING)" : "BENEFITS & LIVING ALLOWANCE", benefitText, currentY, 130);
  currentY += 145;

  drawDetailCard(lang === "bn" ? "যোগ্যতা ও আবেদন প্রক্রিয়া (ELIGIBILITY & STRATEGY)" : "ELIGIBILITY & APPLICATION STRATEGY", eligText, currentY, 150);
  currentY += 165;

  // 8. Bottom Mandatory Watermark & Link (as strictly requested by user)
  ctx.fillStyle = "#1E2C3A";
  ctx.fillRect(36, height - 130, width - 72, 94);
  ctx.strokeStyle = "rgba(245, 176, 65, 0.4)";
  ctx.beginPath();
  ctx.moveTo(36, height - 130);
  ctx.lineTo(width - 36, height - 130);
  ctx.stroke();

  ctx.fillStyle = "#F5B041";
  ctx.font = "bold 20px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Visit https://scholarships.egconsultancy.com.bd/maps for more scholarships around the globe", width / 2, height - 85);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "15px Inter, system-ui, sans-serif";
  ctx.fillText("Excellence Global Consultancy • House 22, Road 1, Block Ta, Mirpur, Dhaka 1216 • WhatsApp: +880 1601-247111", width / 2, height - 55);

  ctx.textAlign = "left"; // reset

  return canvas.toDataURL("image/png");
}

export default function GlobalStudyMapsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // App State: Language & Theme toggles
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [currentTheme, setCurrentTheme] = useState<string>("midnight");
  const [worldData, setWorldData] = useState<WorldData | null>(null);
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
  const selectedIsoRef = useRef<string | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const windowPanelRef = useRef<HTMLElement | null>(null);

  // Detail Modal State
  const [detailScholarship, setDetailScholarship] = useState<ScholarshipItem | null>(null);

  // Continent Highlight State
  const [, setHoveredContinent] = useState<string | null>(null);

  useEffect(() => {
    selectedIsoRef.current = selectedIso;
    if (rendererRef.current) {
      rendererRef.current.selectedCountry = selectedIso;
      rendererRef.current.render();
    }
  }, [selectedIso]);

  const handleContinentHover = useCallback((continentId: string | null) => {
    setHoveredContinent(continentId);
    if (rendererRef.current) {
      rendererRef.current.setHighlightedContinent(continentId);
    }
  }, []);

  const handleContinentClick = useCallback((continentId: string) => {
    setHoveredContinent((prev) => {
      const next = prev === continentId ? null : continentId;
      if (rendererRef.current) {
        rendererRef.current.setHighlightedContinent(next);
      }
      return next;
    });
  }, []);

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
    const canvas = canvasRef.current;
    if (!canvas || !worldData) return;

    const renderer = new MapRenderer(canvas);
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

    // Mobile Touch Gestures: Swipe-to-pan, 2-finger pinch-to-zoom, and reliable tap-to-select
    const touchState = {
      mode: "none" as "none" | "pan" | "pinch",
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startTime: 0,
      startDist: 0,
      lastDist: 0,
      focalX: 0,
      focalY: 0,
      hasMoved: false,
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchTimeRef.current = Date.now();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchState.mode = "pan";
        touchState.startX = t.clientX;
        touchState.startY = t.clientY;
        touchState.lastX = t.clientX;
        touchState.lastY = t.clientY;
        touchState.startTime = Date.now();
        touchState.startDist = 0;
        touchState.lastDist = 0;
        touchState.focalX = t.clientX - rect.left;
        touchState.focalY = t.clientY - rect.top;
        touchState.hasMoved = false;
      } else if (e.touches.length >= 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const rect = canvas.getBoundingClientRect();
        touchState.mode = "pinch";
        touchState.startX = (t0.clientX + t1.clientX) / 2;
        touchState.startY = (t0.clientY + t1.clientY) / 2;
        touchState.lastX = touchState.startX;
        touchState.lastY = touchState.startY;
        touchState.startTime = Date.now();
        touchState.startDist = dist;
        touchState.lastDist = dist;
        touchState.focalX = touchState.startX - rect.left;
        touchState.focalY = touchState.startY - rect.top;
        touchState.hasMoved = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      lastTouchTimeRef.current = Date.now();
      if (e.cancelable) {
        e.preventDefault();
      }
      if (!rendererRef.current) return;

      if (touchState.mode === "pan" && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - touchState.lastX;
        const dy = t.clientY - touchState.lastY;
        const totalDist = Math.hypot(t.clientX - touchState.startX, t.clientY - touchState.startY);

        if (totalDist > 12) {
          touchState.hasMoved = true;
          rendererRef.current.pan(dx, dy);
        }
        touchState.lastX = t.clientX;
        touchState.lastY = t.clientY;
      } else if (e.touches.length >= 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const rect = canvas.getBoundingClientRect();
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        const focalX = midX - rect.left;
        const focalY = midY - rect.top;

        if (touchState.mode !== "pinch") {
          touchState.mode = "pinch";
          touchState.lastDist = dist;
          touchState.lastX = midX;
          touchState.lastY = midY;
          touchState.hasMoved = true;
          return;
        }

        const pdx = midX - touchState.lastX;
        const pdy = midY - touchState.lastY;
        if (Math.hypot(pdx, pdy) > 1) {
          rendererRef.current.pan(pdx, pdy);
        }
        touchState.lastX = midX;
        touchState.lastY = midY;

        if (touchState.lastDist > 0 && Math.abs(dist - touchState.lastDist) > 1) {
          const ratio = dist / touchState.lastDist;
          let newPercent: number;
          if (ratio >= 1) {
            newPercent = rendererRef.current.zoomIn(ratio, [focalX, focalY]);
          } else {
            newPercent = rendererRef.current.zoomOut(1 / ratio, [focalX, focalY]);
          }
          setZoomPercent(newPercent);
          touchState.lastDist = dist;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      lastTouchTimeRef.current = Date.now();
      const totalDist = Math.hypot(touchState.lastX - touchState.startX, touchState.lastY - touchState.startY);
      const isTap = touchState.mode === "pan" && (!touchState.hasMoved || totalDist < 16);

      if (isTap && rendererRef.current) {
        const { country, isHome } = rendererRef.current.hitTest(touchState.startX, touchState.startY);
        if (!isHome && country) {
          if (country.i !== "BGD") {
            const currentIso = selectedIsoRef.current;
            const nextIso = currentIso === country.i ? null : country.i;
            setSelectedIso(nextIso);
            setDetailScholarship(null);
            setHoveredCountry(null);
            rendererRef.current.hoveredCountry = null;
            rendererRef.current.setSelectedCountry(nextIso);

            if (typeof window !== "undefined" && window.innerWidth <= 768 && windowPanelRef.current && nextIso) {
              setTimeout(() => {
                windowPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }, 50);
            }
          }
        } else if (!isHome && !country) {
          setSelectedIso(null);
          setDetailScholarship(null);
          setHoveredCountry(null);
          rendererRef.current.hoveredCountry = null;
          rendererRef.current.clearSelection();
        }
      }

      hasDraggedRef.current = true;

      if (e.touches.length === 0) {
        touchState.mode = "none";
        touchState.hasMoved = false;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        touchState.mode = "pan";
        touchState.startX = t.clientX;
        touchState.startY = t.clientY;
        touchState.lastX = t.clientX;
        touchState.lastY = t.clientY;
        touchState.hasMoved = true;
      }
    };

    const handleTouchCancel = () => {
      lastTouchTimeRef.current = Date.now();
      touchState.mode = "none";
      touchState.hasMoved = false;
      hasDraggedRef.current = false;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", handleTouchCancel, { passive: false });

    return () => {
      renderer.stopAnimation();
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchCancel);
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

  // Toggle Language Handler
  const toggleLanguage = () => {
    setLang((prev) => (prev === "bn" ? "en" : "bn"));
  };

  // Toggle Theme Handler (Midnight Dark vs Daylight Light)
  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "midnight" ? "daylight" : "midnight"));
  };

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
    if (Date.now() - lastTouchTimeRef.current < 1200) return;
    if (e.button === 0) {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;
      setIsDragging(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (Date.now() - lastTouchTimeRef.current < 1200) return;

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
    if (Date.now() - lastTouchTimeRef.current < 1200) return;
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleCanvasMouseLeave = () => {
    if (Date.now() - lastTouchTimeRef.current < 1200) return;
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
    if (Date.now() - lastTouchTimeRef.current < 1200) return;

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
      setHoveredCountry(null);
      rendererRef.current.hoveredCountry = null;
      rendererRef.current.setSelectedCountry(nextIso);
    }
  };

  const handleSelectCountry = (iso: string) => {
    if (iso === "BGD") return;
    const nextIso = selectedIso === iso ? null : (iso || null);
    setSelectedIso(nextIso);
    setDetailScholarship(null);
    setHoveredCountry(null);
    if (rendererRef.current) {
      rendererRef.current.setSelectedCountry(nextIso);
    }
    if (typeof window !== "undefined" && window.innerWidth <= 768 && windowPanelRef.current && nextIso) {
      setTimeout(() => {
        windowPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  };

  const handleClearSelection = () => {
    setSelectedIso(null);
    setDetailScholarship(null);
    setHoveredCountry(null);
    if (rendererRef.current) {
      rendererRef.current.clearSelection();
    }
  };

  // Comprehensive Country Brief Resolver with Fallback
  const resolveCountryBrief = (iso: string, feature?: CountryFeature | null): CountryBrief => {
    if (countryBriefs[iso]) return countryBriefs[iso];
    const nameEn = feature?.n || iso;
    const nameBn = feature?.b || "";
    const continentMap: Record<string, string> = {
      af: "Africa",
      as: "Asia",
      eu: "Europe",
      na: "North America",
      sa: "South America",
      oc: "Oceania",
    };
    const continent = feature?.ct ? continentMap[feature.ct] || feature.ct.toUpperCase() : "Global Destination";
    return {
      nameEn,
      nameBn,
      flag: "",
      continent,
      capital: "National Capital",
      tuition: "বিশ্ববিদ্যালয় ও প্রোগ্রামভেদে ভিন্ন (স্ব-অর্থায়ন $1,500 - $6,000/বছর)",
      livingCost: "$200 - $550 / month (প্রায় ২৪,০০০ - ৬৫,০০০ BDT)",
      blockedAccount: "প্রোগ্রাম ও সংশ্লিষ্ট দূতাবাস নির্দেশনা অনুযায়ী ন্যূনতম ব্যাংক ব্যালেন্স",
      psw: "সংশ্লিষ্ট দেশের অভিবাসন ও নিয়োগকর্তা স্পন্সরশিপ সাপেক্ষ",
      ielts: "সাধারণত ৬.০ - ৬.৫ ব্যান্ড (বা ইংলিশ মিডিয়াম সার্টিফিকেট)",
      cgpa: "স্নাতক/স্নাতকোত্তর প্রোগ্রামের সাধারণ ন্যূনতম জিপিএ/সিজিপিএ",
      visaDhaka: "সংশ্লিষ্ট দূতাবাস / ভিএফএস গ্লোবাল বা ইলেকট্রনিক স্টাডি পারমিটের মাধ্যমে আবেদন",
      successTip: "বিশ্ববিদ্যালয়ের অফিসিয়াল পোর্টালে অ্যাডমিশন ডেটলাইন, টিউশন ফি কাঠামো ও আন্তর্জাতিক শিক্ষার্থী রিকোয়ারমেন্টস যাচাই করুন।",
    };
  };

  // Country Info Resolution
  const selectedFeature = worldData?.f.find((x) => x.i === selectedIso) || null;
  const activeGeo = selectedIso ? geoIndex[selectedIso] : null;
  const activeBrief = useMemo(() => {
    if (!selectedIso) return null;
    return resolveCountryBrief(selectedIso, selectedFeature);
  }, [selectedIso, selectedFeature]);

  const countryNameEn = activeBrief?.nameEn || selectedFeature?.n || selectedIso || "";
  const countryNameBn = activeBrief?.nameBn || selectedFeature?.b || "";

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

  // All available countries for the Dropdown Selector (Only destinations with indexed scholarships)
  const countryOptions = useMemo(() => {
    const list: { iso: string; nameEn: string; nameBn: string; count: number }[] = [];
    if (worldData) {
      for (const f of worldData.f) {
        if (f.i === "BGD") continue;
        const count = geoIndex[f.i]?.totalCount || 0;
        // User Directive: Remove all countries that do not have scholarships from dropdown
        if (count === 0) continue;
        const brief = countryBriefs[f.i];
        const nameEn = brief?.nameEn || f.n || f.i;
        const nameBn = brief?.nameBn || f.b || "";
        list.push({ iso: f.i, nameEn, nameBn, count });
      }
    }
    return list.sort((a, b) => {
      const nameA = lang === "bn" && a.nameBn ? a.nameBn : a.nameEn;
      const nameB = lang === "bn" && b.nameBn ? b.nameBn : b.nameEn;
      return nameA.localeCompare(nameB);
    });
  }, [worldData, lang]);

  // HUD Data
  const hudTarget = hoveredCountry || (selectedIso ? worldData?.f.find((x) => x.i === selectedIso) : null);
  const hudBrief = useMemo(() => {
    if (!hudTarget) return null;
    return resolveCountryBrief(hudTarget.i, hudTarget);
  }, [hudTarget]);
  const hudGeo = hudTarget ? geoIndex[hudTarget.i] : null;

  // Handle Download Scholarship Detail Card (Direct High-Resolution Card Download)
  const handleDownloadScholarshipCard = (item: ScholarshipItem) => {
    try {
      const dataUrl = generateScholarshipCardImage(
        item,
        countryNameEn,
        countryNameBn,
        lang
      );
      if (!dataUrl) return;
      const link = document.createElement("a");
      const safeName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      link.download = `${safeName}-scholarship-card.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download scholarship card image", err);
    }
  };

  return (
    <div className={styles.compassShell} data-theme={currentTheme === "daylight" ? "light" : "dark"}>
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
          {/* Toggle 1: Language Switcher (Segmented: BN / EN) */}
          <div
            className={styles.segmentedToggle}
            onClick={toggleLanguage}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleLanguage(); }}
            title={lang === "bn" ? "Current: বাংলা (Click to switch to English)" : "Current: English (Click to switch to বাংলা)"}
            aria-label="Toggle language between Bangla and English"
          >
            <span className={`${styles.segmentOption} ${lang === "bn" ? styles.segmentActive : ""}`}>
              বাংলা
            </span>
            <span className={`${styles.segmentOption} ${lang === "en" ? styles.segmentActive : ""}`}>
              English
            </span>
          </div>

          {/* Toggle 2: Theme Switcher (Segmented: Dark / Light) */}
          <div
            className={styles.segmentedToggle}
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleTheme(); }}
            title={currentTheme === "midnight" ? "Current: Dark Mode (Click for Light Mode)" : "Current: Light Mode (Click for Dark Mode)"}
            aria-label="Toggle dark and light theme"
          >
            <span className={`${styles.segmentOption} ${currentTheme === "midnight" ? styles.segmentActive : ""}`}>
              <MoonIcon /> Dark
            </span>
            <span className={`${styles.segmentOption} ${currentTheme === "daylight" ? styles.segmentActive : ""}`}>
              <SunIcon /> Light
            </span>
          </div>

          {/* Direct Link to Scholarship Portal Profile Builder */}
          <Link className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} href="/dashboard">
            {lang === "bn" ? "প্রোফাইল সেট করুন →" : "Set Your Profile →"}
          </Link>
        </div>
      </header>

      {/* 2. Zero-Overlap Dynamic HUD Ribbon (Above Map) */}
      <section className={styles.hudRibbon} id="compass-hud">
        <div className={styles.hudLeft}>
          {isHoveredHome ? (
            <div className={styles.hudPrompt}>
              <span className={styles.bdBadge}>BD</span>
              <strong>{lang === "bn" ? "বাংলাদেশ (BD) — হোম লোকেশন" : "Bangladesh (BD) — Home Location"}</strong>
              <span>{lang === "bn" ? "উচ্চশিক্ষার লক্ষ্য হিসেবে বিশ্বের যেকোনো গন্তব্য দেশ ক্লিক করুন (BD Origin) ↗" : "Click any global destination to explore scholarships & cost reality ↗"}</span>
            </div>
          ) : hudTarget ? (
            <>
              <span className={styles.hudCountryName}>
                {lang === "bn" && hudBrief?.nameBn ? hudBrief.nameBn : hudTarget.n}
                <small className={styles.hudCountryBn}>
                  ({lang === "bn" ? hudTarget.n : (hudBrief?.nameBn || "")})
                </small>
              </span>
              <div className={styles.hudPills}>
                {hudGeo ? (
                  <>
                    <span className={`${styles.hudPill} ${styles.hudPillGold}`}>
                      <GradCapIcon /> {hudGeo.totalCount} {lang === "bn" ? "স্কলারশিপ" : "Scholarships"}
                    </span>
                    {hudGeo.fullyFundedCount > 0 && (
                      <span className={`${styles.hudPill} ${styles.hudPillGreen}`}>
                        <span className={styles.statusDotGreen} /> {hudGeo.fullyFundedCount} {lang === "bn" ? "সম্পূর্ণ ফান্ডেড" : "Fully Funded"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className={styles.hudPill}>{lang === "bn" ? "আন্তর্জাতিক গন্তব্য দেশ" : "Global Study Destination"}</span>
                )}
                {hudBrief && (
                  <span className={`${styles.hudPill} ${styles.hudPillBlue}`}>
                    <BuildingIcon /> {hudBrief.tuition.slice(0, 32)}...
                  </span>
                )}
                {universities.filter((u) => u.iso === hudTarget.i).length > 0 && (
                  <span className={styles.hudPill}>
                    <StarIcon /> {universities.filter((u) => u.iso === hudTarget.i).length} {lang === "bn" ? "QS শীর্ষ বিশ্ববিদ্যালয়" : "QS Top Universities"}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className={styles.hudPrompt}>
              <span>
                <strong>{lang === "bn" ? "স্বাগতম EG Global Study Maps-এ!" : "Welcome to EG Global Study Maps!"}</strong> {lang === "bn" ? "মানচিত্রের দেশ অথবা ড্রপডাউন থেকে যেকোনো দেশ নির্বাচন করে স্কলারশিপ, টিউশন ফি ও লিভিং কস্ট এক্সপ্লোর করুন।" : "Select any country from the map or dropdown to explore scholarships, living expenses, and top universities."}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Main Split-Screen Workspace */}
      <section className={styles.mainGrid}>
        {/* Left Column: Interactive Vector Canvas */}
        <div className={styles.mapColumn}>
          {/* Mode Tabs, Country Dropdown Selector & Selection Pill */}
          <div className={styles.mapToolbar}>
            <div className={styles.modeTabs}>
              <button
                className={`${styles.tabBtn} ${activeMode === "scholarships" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("scholarships")}
              >
                <GradCapIcon /> {lang === "bn" ? "স্কলারশিপ ডিরেক্টরি" : "Scholarship Directory"}
              </button>
              <button
                className={`${styles.tabBtn} ${activeMode === "universities" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("universities")}
              >
                <BuildingIcon /> {lang === "bn" ? "শীর্ষ বিশ্ববিদ্যালয়" : "Top Universities"}
              </button>
              <button
                className={`${styles.tabBtn} ${activeMode === "top100" ? styles.tabBtnActive : ""}`}
                onClick={() => setActiveMode("top100")}
              >
                <StarIcon /> {lang === "bn" ? "গ্লোবাল টপ ১০০" : "Global Top 100"}
              </button>
            </div>

            {/* Country Selector Dropdown Menu (Only countries with scholarships) */}
            <div className={styles.countrySelectWrap}>
              <label htmlFor="country-selector" className={styles.countrySelectLabel}>
                <GlobeIcon />
                <span>{lang === "bn" ? "দেশ নির্বাচন:" : "Select Country:"}</span>
              </label>
              <select
                id="country-selector"
                className={styles.countrySelect}
                value={selectedIso || ""}
                onChange={(e) => handleSelectCountry(e.target.value)}
                aria-label={lang === "bn" ? "দেশ নির্বাচন করুন" : "Choose Country"}
              >
                <option value="">
                  {lang === "bn" ? "-- স্কলারশিপ সহ দেশ বেছে নিন --" : "-- Select Scholarship Destination --"}
                </option>
                {countryOptions.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {lang === "bn"
                      ? `${c.nameBn ? c.nameBn + " (" + c.nameEn + ")" : c.nameEn} • ${c.count}টি স্কলারশিপ`
                      : `${c.nameEn}${c.nameBn ? " (" + c.nameBn + ")" : ""} • ${c.count} Scholarships`}
                  </option>
                ))}
              </select>
            </div>

            {selectedIso && (
              <div className={styles.selectionPill}>
                <CheckIcon />
                <span>{lang === "bn" ? (countryNameBn || countryNameEn) : countryNameEn} {lang === "bn" ? "নির্বাচিত" : "Selected"}</span>
                <button className={styles.clearBtn} onClick={handleClearSelection} title={lang === "bn" ? "রিসেট করুন" : "Deselect country"}>
                  {lang === "bn" ? "রিসেট" : "Clear"}
                </button>
              </div>
            )}
          </div>

          {/* Global Funding Filter Bar */}
          <div className={styles.fundingFilterBar}>
            <span className={styles.fundingFilterLabel}>
              <FilterIcon /> {lang === "bn" ? "ফান্ডিং ফিল্টার:" : "Funding Filter:"}
            </span>
            <div className={styles.fundingFilterPills}>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "all" ? styles.fundingFilterPillActive : ""}`}
                onClick={() => handleFundingFilterChange("all")}
              >
                {lang === "bn" ? "All (সব ফান্ডিং)" : "All Funding"}
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "fully_funded" ? styles.fundingFilterPillGreenActive : ""}`}
                onClick={() => handleFundingFilterChange("fully_funded")}
              >
                <span className={styles.statusDotGreen} />
                {lang === "bn" ? "Fully Funded (সম্পূর্ণ ফান্ডেড)" : "Fully Funded"}
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "full_tuition" ? styles.fundingFilterPillBlueActive : ""}`}
                onClick={() => handleFundingFilterChange("full_tuition")}
              >
                <span className={styles.statusDotBlue} />
                {lang === "bn" ? "100% Tuition (টিউশন ফ্রি)" : "100% Tuition Waiver"}
              </button>
              <button
                className={`${styles.fundingFilterPill} ${fundingFilter === "partial" ? styles.fundingFilterPillAmberActive : ""}`}
                onClick={() => handleFundingFilterChange("partial")}
              >
                <span className={styles.statusDotAmber} />
                {lang === "bn" ? "Partial (আংশিক স্কলারশিপ)" : "Partial Scholarship"}
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
          </div>

          {/* Bottom Map Legend */}
          <footer className={styles.mapFooter}>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#059669" }}></span>
                <span>BD (Bangladesh)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#F5B041" }}></span>
                <span>{lang === "bn" ? "নির্বাচিত দেশ" : "Selected Destination"}</span>
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
                      ? (lang === "bn" ? "সম্পূর্ণ ফান্ডেড স্কলারশিপ অফার করে" : "Offers Fully Funded Awards")
                      : fundingFilter === "full_tuition"
                      ? (lang === "bn" ? "১০০% টিউশন ওয়েভার অফার করে" : "Offers Full Tuition Waivers")
                      : (lang === "bn" ? "আংশিক বৃত্তি অফার করে" : "Offers Partial Awards")}
                  </span>
                </div>
              ) : (
                <div className={styles.footerContinentPills}>
                  {CONTINENTS.map((c) => (
                    <div
                      key={c.id}
                      className={styles.legendItem}
                      onMouseEnter={() => handleContinentHover(c.id)}
                      onMouseLeave={() => handleContinentHover(null)}
                      onClick={() => handleContinentClick(c.id)}
                      style={{ cursor: "pointer", transition: "transform 0.15s ease" }}
                      title={`${lang === "bn" ? c.nameBn : c.nameEn} - ক্লিক করে মহাদেশ হাইলাইট করুন`}
                    >
                      <span className={styles.legendDot} style={{ background: c.badge }} />
                      <span>{lang === "bn" ? c.nameBn : c.nameEn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ color: "#94A3B8" }}>
              {lang === "bn"
                ? "মানচিত্র বা ড্রপডাউন থেকে দেশ বেছে নিন • স্ক্রল / ড্র্যাগ করে জুম ও প্যান করুন"
                : "Select a country from map or dropdown • Scroll / drag to zoom & pan"}
            </div>
          </footer>
        </div>

        {/* Right Column: Sliding Window Panel */}
        <aside ref={windowPanelRef} className={styles.windowPanel}>
          {selectedIso ? (
            <>
              {/* Country Hero Header */}
              <header className={styles.panelHeader}>
                <div className={styles.countryHero}>
                  <div>
                    <div className={styles.heroTitle}>
                      {lang === "bn" && countryNameBn ? countryNameBn : countryNameEn}
                      {countryNameBn && (
                        <small className={styles.heroBn}>
                          ({lang === "bn" ? countryNameEn : countryNameBn})
                        </small>
                      )}
                    </div>
                    <div className={styles.heroSub}>
                      {activeBrief?.continent || selectedFeature?.ct?.toUpperCase() || "Global Hub"} • Capital: {activeBrief?.capital || "National Capital"} • {activeGeo?.totalCount || 0} {lang === "bn" ? "টি স্কলারশিপ" : "Aggregated Awards"}
                    </div>
                  </div>
                </div>
              </header>

              {/* BD Student Perspective Overview Brief */}
              {activeBrief && (
                <div className={styles.briefBox}>
                  <div className={styles.briefHeading}>
                    <span className={styles.bdBadge}>BD</span>
                    {lang === "bn" ? "বাংলাদেশি শিক্ষার্থীদের জন্য বাস্তবতা (BD Perspective)" : "Student Reality & Overview (BD Perspective)"}
                  </div>
                  <div className={styles.briefGrid}>
                    <div className={styles.briefRow}>
                      <b>{lang === "bn" ? "টিউশন ফি:" : "Tuition Fee:"}</b>
                      <span>{activeBrief.tuition}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>{lang === "bn" ? "লিভিং কস্ট:" : "Living Cost:"}</b>
                      <span>{activeBrief.livingCost}</span>
                    </div>
                    {activeBrief.blockedAccount && (
                      <div className={styles.briefRow}>
                        <b>{lang === "bn" ? "ব্যাংক সলভেন্সি:" : "Bank Solvency:"}</b>
                        <span>{activeBrief.blockedAccount}</span>
                      </div>
                    )}
                    <div className={styles.briefRow}>
                      <b>{lang === "bn" ? "পোস্ট-স্টাডি ভিসা:" : "Post-Study Work Visa:"}</b>
                      <span>{activeBrief.psw}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>{lang === "bn" ? "আইইএলটিএস ব্যান্ড:" : "IELTS Requirement:"}</b>
                      <span>{activeBrief.ielts}</span>
                    </div>
                    <div className={styles.briefRow}>
                      <b>{lang === "bn" ? "ভিসা প্রসেসিং:" : "Visa Processing:"}</b>
                      <span>{activeBrief.visaDhaka}</span>
                    </div>
                  </div>
                  <div className={styles.briefTip}>
                    <strong>{lang === "bn" ? "পরামর্শ:" : "Advice:"}</strong> {activeBrief.successTip}
                  </div>
                </div>
              )}

              {/* Dynamic Content based on Active Mode */}
              <div className={styles.panelContent}>
                {activeMode === "universities" ? (
                  <>
                    <div className={styles.sectionTitle}>
                      <span>{lang === "bn" ? `শীর্ষ বিশ্ববিদ্যালয় (${activeUniversities.length})` : `Top Universities (${activeUniversities.length})`}</span>
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
                            <div className={styles.univCity}>{u.city}</div>
                            <div className={styles.univStrengths}>{u.strengths}</div>
                            <span className={styles.univPsw}>PSW: {u.psw}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p style={{ color: "#94A3B8", fontSize: "0.85rem", padding: "10px 0" }}>
                        {lang === "bn"
                          ? "নির্বাচিত দেশের জাতীয় বিশ্ববিদ্যালয় ও স্কলারশিপ দেখতে স্কলারশিপ ট্যাবে স্যুইচ করুন।"
                          : "Selected country has high-repute national institutions. Switch to Scholarships tab to explore university-linked awards."}
                      </p>
                    )}
                  </>
                ) : activeMode === "top100" ? (
                  <>
                    <div className={styles.sectionTitle}>
                      <span>{lang === "bn" ? "বিশ্বের শীর্ষ ১০০ প্রতিষ্ঠান (QS Top 100)" : "QS World Top 100 Universities"}</span>
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
                          <div className={styles.univCity}>{u.city}, {u.country}</div>
                          <div className={styles.univStrengths}>{u.strengths}</div>
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
                          <span>{lang === "bn" ? "স্কলারশিপ তালিকাভুক্তির তথ্য" : "Scholarship Status"}</span>
                        </div>
                        <h3 className={styles.emptyTitle}>
                          {lang === "bn"
                            ? `বর্তমানে ${countryNameEn} ${countryNameBn ? `(${countryNameBn})` : ""}-এ বাংলাদেশি শিক্ষার্থীদের জন্য কোনো সক্রিয় স্কলারশিপ তালিকাভুক্ত নেই`
                            : `Currently no active scholarships listed for ${countryNameEn} for Bangladeshi students`}
                        </h3>
                        <p className={styles.emptyText}>
                          {lang === "bn"
                            ? "Excellence Global নিয়মিত বাংলাদেশ শিক্ষা মন্ত্রণালয় (MoE), সংশ্লিষ্ট দেশের দূতাবাস এবং আন্তর্জাতিক শিক্ষাবোর্ডসমূহের দ্বিপাক্ষিক সার্কুলার পর্যবেক্ষণ করে। নতুন কোনো সরকারি চুক্তি বা প্রাতিষ্ঠানিক সুযোগ উন্মুক্ত হলে আমাদের ডাটাবেজে তাৎক্ষণিকভাবে হালনাগাদ করা হবে।"
                            : "Excellence Global continuously monitors bilateral agreements, Ministry of Education notifications, and embassy circulars. New institutional routes will be added immediately upon verification."}
                        </p>

                        <div className={styles.emptyGuidanceBox}>
                          <div className={styles.emptyGuidanceTitle}>
                            <BuildingIcon />
                            <span>{lang === "bn" ? "সেলফ-ফান্ডেড ও সরাসরি আবেদন" : "Self-Funded & Direct Admissions"}</span>
                          </div>
                          <p className={styles.emptyGuidanceText}>
                            {lang === "bn"
                              ? "যদি আপনি এই দেশে স্ব-অর্থায়নে পড়তে আগ্রহী হন, তবে ইউনিভার্সিটির অফিসিয়াল ওয়েবসাইটে আন্তর্জাতিক টিউশন ফি, ন্যূনতম আইইএলটিএস এবং অ্যাডমিশন ডেটলাইন যাচাই করুন।"
                              : "For self-funded study in this destination, inspect tuition fees, intake deadlines, and minimum IELTS requirements directly on official university portals."}
                          </p>
                        </div>

                        <div className={styles.emptyGuidanceBox}>
                          <div className={styles.emptyGuidanceTitle}>
                            <GlobeIcon />
                            <span>{lang === "bn" ? "জনপ্রিয় বিকল্প স্কলারশিপ গন্তব্য" : "Popular Alternative Destinations"}</span>
                          </div>
                          <p className={styles.emptyGuidanceText}>
                            {lang === "bn"
                              ? "বাংলাদেশি শিক্ষার্থীদের জন্য শতাধিক সক্রিয় স্কলারশিপ চালু থাকা কয়েকটি শীর্ষ গন্তব্য:"
                              : "Top study destinations offering active scholarships for Bangladeshi students:"}
                          </p>
                          <div className={styles.welcomeChipsWrap}>
                            {POPULAR_DESTINATIONS.slice(0, 8).map((dest) => (
                              <button
                                key={dest.iso}
                                className={styles.welcomeChip}
                                onClick={() => handleSelectCountry(dest.iso)}
                              >
                                {lang === "bn" ? dest.nameBn : dest.nameEn}
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
                          {lang === "bn" ? "ফ্রি প্রোফাইল মূল্যায়ন (হোয়াটসঅ্যাপ কনসাল্টেশন) →" : "Free Profile Assessment (WhatsApp Consultation) →"}
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className={styles.sectionTitle}>
                          <span>
                            {lang === "bn" ? `স্কলারশিপ ও অনুদান (${tierFilteredItems.length})` : `Scholarships & Grants (${tierFilteredItems.length})`}
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

                        {/* Check if funding filter produces 0 items */}
                        {tierFilteredItems.length === 0 ? (
                          <div className={styles.noMatchNotice}>
                            <div>
                              {lang === "bn"
                                ? "বর্তমান ফিল্টারের সাথে এই দেশের কোনো স্কলারশিপ মিলছে না।"
                                : "No scholarships match the current funding filter for this destination."}
                              {fundingFilter !== "all" && (
                                <div style={{ marginTop: 4, fontSize: "0.78rem" }}>
                                  {lang === "bn"
                                    ? `(এই দেশে মোট ${activeGeo.totalCount}টি স্কলারশিপ তালিকাভুক্ত রয়েছে)`
                                    : `(Total ${activeGeo.totalCount} scholarships indexed for this destination)`}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              {fundingFilter !== "all" && (
                                <button
                                  className={styles.matchToggleBtn}
                                  onClick={() => handleFundingFilterChange("all")}
                                >
                                  {lang === "bn" ? "ফান্ডিং ফিল্টার রিসেট করুন" : "Reset Funding Filter"}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          tierFilteredItems.map((s) => (
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
                                    ? (lang === "bn" ? "সম্পূর্ণ ফান্ডেড" : "Fully Funded")
                                    : s.fundingTier === "full_tuition"
                                    ? (lang === "bn" ? "১০০% টিউশন ওয়েভার" : "100% Tuition Waiver")
                                    : (lang === "bn" ? "আংশিক স্কলারশিপ" : "Partial Scholarship")}
                                </span>
                              </div>

                              <div className={styles.cardProvider}>{s.provider}</div>

                              <div className={styles.cardMeta}>
                                <span>{s.coverage?.slice(0, 48) || (lang === "bn" ? "ফান্ডিংয়ের বিবরণ" : "Funding details")}...</span>
                                <span><CalendarIcon /> {s.deadline || (lang === "bn" ? "আসন্ন সেশন" : "Upcoming Intake")}</span>
                              </div>

                              <div className={styles.cardActions}>
                                {/* Direct In-Page Details Modal Button */}
                                <button
                                  className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                                  onClick={() => setDetailScholarship(s)}
                                >
                                  {lang === "bn" ? "বিস্তারিত দেখুন" : "View Details"}
                                </button>
                                <a
                                  className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                                  href={s.officialSource}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {lang === "bn" ? "অফিসিয়াল পোর্টাল ↗" : "Official Source ↗"}
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
                <span className={styles.welcomeHeroBadge}>{lang === "bn" ? "গ্লোবাল স্টাডি ম্যাপস" : "Global Study Maps"}</span>
                <h1 className={styles.welcomeHeroTitle}>{lang === "bn" ? "গ্লোবাল স্টাডি ম্যাপস" : "Global Study Maps"}</h1>
                <p className={styles.welcomeHeroSub}>
                  {lang === "bn"
                    ? "বাংলাদেশি শিক্ষার্থীদের জন্য ৭৮+ দেশের স্কলারশিপ, টিউশন ফি, লিভিং কস্ট ও শীর্ষ বিশ্ববিদ্যালয়ের সমন্বিত ইন্টারেক্টিভ মানচিত্র।"
                    : "Interactive global study map covering scholarships, tuition fees, living expenses, and top universities across 78+ countries."}
                </p>
                <div className={styles.welcomeHeroMotto}>
                  &ldquo;Study abroad with a plan, not confusion.&rdquo; — Excellence Global
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className={styles.welcomeStatsGrid}>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>৫৬৯+</span>
                  <span className={styles.welcomeStatLabel}>{lang === "bn" ? "ভেরিফায়েড স্কলারশিপ" : "Verified Scholarships"}</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>৭৮+</span>
                  <span className={styles.welcomeStatLabel}>{lang === "bn" ? "গ্লোবাল গন্তব্য দেশ" : "Global Destinations"}</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>১০০</span>
                  <span className={styles.welcomeStatLabel}>{lang === "bn" ? "QS শীর্ষ বিশ্ববিদ্যালয়" : "QS Top Universities"}</span>
                </div>
                <div className={styles.welcomeStatCard}>
                  <span className={styles.welcomeStatNum}>০৳</span>
                  <span className={styles.welcomeStatLabel}>{lang === "bn" ? "১০০% উন্মুক্ত এক্সেস" : "100% Free Access"}</span>
                </div>
              </div>

              {/* 3 Easy Steps Walkthrough */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeSectionTitle}>
                  <span>{lang === "bn" ? "ব্যবহারের নির্দেশিকা (৩টি সহজ ধাপ)" : "User Guide (3 Simple Steps)"}</span>
                </div>
                <div className={styles.welcomeSteps}>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>১</div>
                    <div className={styles.stepText}>
                      <strong>{lang === "bn" ? "মানচিত্র বা ড্রপডাউন থেকে দেশ নির্বাচন করুন:" : "Select country from map or dropdown:"}</strong>{" "}
                      {lang === "bn"
                        ? "ফ্লাইটের রুট আঁকা হবে এবং ডানপাশের প্যানেলে তাৎক্ষণিকভাবে টিউশন ফি ও লিভিং কস্ট দেখতে পাবেন।"
                        : "Flight route is animated and tuition, living cost & reality breakdown display instantly."}
                    </div>
                  </div>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>২</div>
                    <div className={styles.stepText}>
                      <strong>{lang === "bn" ? "ফান্ডিং ফিল্টার সেট করুন:" : "Set funding filter:"}</strong>{" "}
                      {lang === "bn"
                        ? "আপনার পছন্দের সম্পূর্ণ ফান্ডেড, টিউশন ফ্রি বা আংশিক স্কলারশিপ এক ক্লিকে ফিল্টার করুন।"
                        : "Filter between Fully Funded, 100% Tuition Waiver, or Partial scholarships with one click."}
                    </div>
                  </div>
                  <div className={styles.stepItem}>
                    <div className={styles.stepNum}>৩</div>
                    <div className={styles.stepText}>
                      <strong>{lang === "bn" ? "View Details বা Download Card চাপুন:" : "Click View Details or Download Card:"}</strong>{" "}
                      {lang === "bn"
                        ? "প্রতিটি বৃত্তির সম্পূর্ণ বিস্তারিত তথ্য দেখুন অথবা বন্ধুদের সাথে শেয়ার করতে হাই-রেজ স্কলারশিপ কার্ড ডাউনলোড করুন।"
                        : "Inspect complete award criteria or download a high-resolution scholarship card image."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Popular Study Destinations Quick Chips (Clean individual buttons, zero flags or CA/AU words) */}
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeSectionTitle}>
                  <span>{lang === "bn" ? "জনপ্রিয় স্টাডি ডেস্টিনেশন (এক ক্লিকে দেখুন)" : "Popular Study Destinations"}</span>
                </div>
                <div className={styles.welcomeChipsWrap}>
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <button
                      key={dest.iso}
                      className={styles.welcomeChip}
                      onClick={() => handleSelectCountry(dest.iso)}
                    >
                      {lang === "bn" ? dest.nameBn : dest.nameEn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      {/* =========================================================================
          MODAL: Scholarship Instant Detail Pop-Up with Direct Card Download
          ========================================================================= */}
      {detailScholarship && (
        <div
          className={styles.detailModalOverlay}
          onClick={() => setDetailScholarship(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Scholarship Details"
        >
          <div
            className={styles.detailModalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.detailHeader}>
              <div className={styles.detailTitleWrap}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
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
                      ? (lang === "bn" ? "সম্পূর্ণ ফান্ডেড স্কলারশিপ" : "Fully Funded Award")
                      : detailScholarship.fundingTier === "full_tuition"
                      ? (lang === "bn" ? "১০০% টিউশন ওয়েভার" : "100% Tuition Waiver")
                      : (lang === "bn" ? "আংশিক স্কলারশিপ" : "Partial Scholarship")}
                  </span>
                  <span className={styles.floatingCountryBadge}>
                    {lang === "bn" ? `${countryNameBn || countryNameEn} (${countryNameEn})` : `${countryNameEn} ${countryNameBn ? `(${countryNameBn})` : ""}`}
                  </span>
                </div>
                <h2 className={styles.detailTitle}>{detailScholarship.name}</h2>
                <div className={styles.detailProvider}>
                  {detailScholarship.provider}
                </div>
              </div>

              <button
                className={styles.detailModalClose}
                onClick={() => setDetailScholarship(null)}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className={styles.detailSections}>
              {detailScholarship.overallSummary ? (
                <>
                  <div className={styles.detailSectionCard}>
                    <div className={styles.detailSectionHeader}>
                      {lang === "bn" ? "খরচ ও টিউশন ফি" : "Cost & Tuition Coverage"}
                    </div>
                    <div className={styles.detailSectionBody}>{detailScholarship.overallSummary.cost}</div>
                  </div>

                  <div className={styles.detailSectionCard}>
                    <div className={styles.detailSectionHeader}>
                      {lang === "bn" ? "সুবিধা ও আবাসন ভাতা" : "Benefits & Living Allowance"}
                    </div>
                    <div className={styles.detailSectionBody}>{detailScholarship.overallSummary.benefits}</div>
                  </div>

                  <div className={styles.detailSectionCard}>
                    <div className={styles.detailSectionHeader}>
                      {lang === "bn" ? "যোগ্যতা ও আবেদন প্রক্রিয়া" : "Eligibility & Application Strategy"}
                    </div>
                    <div className={styles.detailSectionBody}>{detailScholarship.overallSummary.other}</div>
                  </div>
                </>
              ) : (
                <div className={styles.detailSectionCard}>
                  <div className={styles.detailSectionHeader}>
                    {lang === "bn" ? "স্কলারশিপ কাভারেজ" : "Scholarship Coverage"}
                  </div>
                  <div className={styles.detailSectionBody}>
                    {detailScholarship.coverage || (lang === "bn" ? "ফান্ডিং ও স্কলারশিপের বিবরণ অফিসিয়াল পোর্টালে বিস্তারিত রয়েছে।" : "Full coverage and funding guidelines are specified on the official award portal.")}
                  </div>
                </div>
              )}

              <div className={styles.detailMetaPills}>
                <div className={styles.detailMetaPill}>
                  <b>{lang === "bn" ? "প্রোগ্রাম:" : "Program:"}</b> {detailScholarship.studyLevel || (lang === "bn" ? "সকল প্রোগ্রাম" : "All Programs")}
                </div>
                <div className={styles.detailMetaPill}>
                  <b>{lang === "bn" ? "ডেডলাইন:" : "Deadline:"}</b> {detailScholarship.deadline || (lang === "bn" ? "আসন্ন সেশন" : "Upcoming Intake")}
                </div>
                <div className={styles.detailMetaPill}>
                  <b>{lang === "bn" ? "স্ট্যাটাস:" : "Status:"}</b> {lang === "bn" ? "সক্রিয় / যাচাইকৃত" : (detailScholarship.status || "Active / Verified")}
                </div>
                <div className={styles.detailMetaPill}>
                  <b>{lang === "bn" ? "যাচাইকরণ:" : "Verification:"}</b> {lang === "bn" ? "ইজি রিসার্চ ডেস্ক যাচাইকৃত" : "EG Research Desk Verified"}
                </div>
              </div>
            </div>

            <div className={styles.detailActions}>
              {/* Direct Card Download Button (Generates and downloads the scholarship card itself) */}
              <button
                className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                onClick={() => handleDownloadScholarshipCard(detailScholarship)}
                title={lang === "bn" ? "এই স্কলারশিপ কার্ডটি হাই-রেজুলিউশনে ডাউনলোড করুন" : "Download high-resolution scholarship card"}
              >
                <DownloadIcon /> {lang === "bn" ? "কার্ড ডাউনলোড করুন" : "Download Card"}
              </button>
              <a
                className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                href={detailScholarship.officialSource}
                target="_blank"
                rel="noreferrer"
                title="Visit official portal"
              >
                <ExternalLinkIcon /> {lang === "bn" ? "অফিসিয়াল পোর্টাল ↗" : "Official Portal ↗"}
              </a>
              <button
                className={`${styles.cardBtn} ${styles.cardBtnSecondary}`}
                onClick={() => setDetailScholarship(null)}
              >
                {lang === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
