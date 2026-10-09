// High-Performance Native Canvas 2D Map Engine for EG Scholarships
// Adapted from the lightweight vector canvas pattern of unseenbangladesh.com

export type CountryFeature = {
  i: string; // ISO Code (AUT, GBR, DEU, BGD, etc.)
  b?: string; // Bengali Name (অস্ট্রিয়া, জার্মানি, ইত্যাদি)
  n: string; // English Name (Austria, Germany, etc.)
  ct: string; // Continent (eu, as, na, sa, af, oc)
  c: [number, number]; // Centroid [cx, cy] in 1000x444.7 coordinate space
  sm?: number; // 1 for tiny island states (Singapore, Malta, Cyprus, etc.)
  d: string; // SVG path string
};

export type WorldData = {
  w: number; // 1000
  h: number; // 444.7
  f: CountryFeature[];
  bg: string;
};

export type University = {
  rank: number;
  name: string;
  iso: string;
  country: string;
  city: string;
  c: [number, number];
  strengths: string;
  psw: string;
  scholarships: string[];
};

export type CountryBrief = {
  nameEn: string;
  nameBn: string;
  flag: string;
  continent: string;
  capital: string;
  tuition: string;
  livingCost: string;
  blockedAccount: string;
  psw: string;
  ielts: string;
  cgpa: string;
  visaDhaka: string;
  successTip: string;
};

export type ThemeTokens = {
  id: string;
  name: string;
  bg: string;
  land: string;
  stroke: string;
  v1: string;
  v2: string;
  glow: string;
  vStroke: string;
  halo: string;
  dot: string;
  text: string;
  hudBg: string;
  hudBorder: string;
};

export const THEMES: Record<string, ThemeTokens> = {
  midnight: {
    id: "midnight",
    name: "EG Midnight (গোল্ডেন নেভি)",
    bg: "#16222F",
    land: "#243447",
    stroke: "#384E66",
    v1: "#F5B041",
    v2: "#E67E22",
    glow: "rgba(245, 176, 65, 0.45)",
    vStroke: "#FCD385",
    halo: "#FFFFFF",
    dot: "#F5B041",
    text: "#FFFFFF",
    hudBg: "#1E2C3A",
    hudBorder: "#34495E",
  },
  daylight: {
    id: "daylight",
    name: "Daylight (স্বচ্ছ আকাশী)",
    bg: "#FAF8F4",
    land: "#E2E8F0",
    stroke: "#CBD5E1",
    v1: "#3498DB",
    v2: "#2980B9",
    glow: "rgba(52, 152, 219, 0.35)",
    vStroke: "#1D4ED8",
    halo: "#FFFFFF",
    dot: "#3498DB",
    text: "#1E293B",
    hudBg: "#FFFFFF",
    hudBorder: "#E2E8F0",
  },
  emerald: {
    id: "emerald",
    name: "Emerald (পান্না সবুজ)",
    bg: "#F2F7F4",
    land: "#D7E3DC",
    stroke: "#B2C7BC",
    v1: "#0F766E",
    v2: "#10B981",
    glow: "rgba(16, 185, 129, 0.4)",
    vStroke: "#047857",
    halo: "#FFFFFF",
    dot: "#10B981",
    text: "#0F2E22",
    hudBg: "#FFFFFF",
    hudBorder: "#D1FAE5",
  },
  sunset: {
    id: "sunset",
    name: "Sunset (গোধূলি লাল)",
    bg: "#1C1726",
    land: "#342845",
    stroke: "#493961",
    v1: "#FF7849",
    v2: "#E11D48",
    glow: "rgba(249, 115, 22, 0.45)",
    vStroke: "#FB923C",
    halo: "#FFFFFF",
    dot: "#FF7849",
    text: "#FFFFFF",
    hudBg: "#171220",
    hudBorder: "#3B2A50",
  },
};

// Funding color codes for profile matching view
export const FUNDING_COLORS = {
  fully_funded: {
    fill: "#10B981", // Emerald
    stroke: "#059669",
    label: "Fully Funded (টিউশন + লিভিং ভাতা)",
  },
  full_tuition: {
    fill: "#38BDF8", // Sky Blue
    stroke: "#0284C7",
    label: "Full Tuition Waiver (১০০% টিউশন ফ্রি)",
  },
  partial: {
    fill: "#F59E0B", // Amber
    stroke: "#D97706",
    label: "Partial Scholarship (আংশিক ওয়েভার)",
  },
  other: {
    fill: "#64748B", // Slate
    stroke: "#475569",
    label: "Self-Funded / High Gap",
  },
};

// Dhaka Home Coordinate in 1000x444.7
export const DHAKA_COORD: [number, number] = [741.4, 155.3];

export class MapRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  worldData: WorldData | null = null;
  paths: Record<string, Path2D> = {};
  theme: ThemeTokens = THEMES.midnight;
  selectedCountry: string | null = null;
  hoveredCountry: string | null = null;
  hoveredUniversity: University | null = null;
  mode: "scholarships" | "universities" | "top100" = "scholarships";
  universities: University[] = [];
  countryFundingTiers: Record<string, "fully_funded" | "full_tuition" | "partial" | "other"> = {};
  showProfileColors: boolean = false;
  arcPulsePhase: number = 0;
  animationFrameId: number | null = null;


  // Viewport transforms & zoom controls
  baseScale: number = 1;
  baseOffsetX: number = 0;
  baseOffsetY: number = 10;
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  scale: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;
  dpr: number = 1;
  activeFundingFilter: "all" | "fully_funded" | "full_tuition" | "partial" = "all";
  geoIndexData: Record<string, any> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not acquire 2D canvas context");
    this.ctx = context;
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  }

  setWorldData(data: WorldData) {
    this.worldData = data;
    this.paths = {};
    for (const f of data.f) {
      if (f.d) {
        this.paths[f.i] = new Path2D(f.d);
      }
    }
  }

  setUniversities(list: University[]) {
    this.universities = list;
  }

  setFundingTiers(tiers: Record<string, "fully_funded" | "full_tuition" | "partial" | "other">) {
    this.countryFundingTiers = tiers;
  }

  setGeoIndexData(data: Record<string, any>) {
    this.geoIndexData = data;
  }

  setFundingFilter(filter: "all" | "fully_funded" | "full_tuition" | "partial") {
    this.activeFundingFilter = filter;
    this.render();
  }

  setTheme(themeId: string) {
    if (THEMES[themeId]) {
      this.theme = THEMES[themeId];
      this.render();
    }
  }

  updateTransform() {
    this.scale = this.baseScale * this.zoomLevel;
    this.offsetX = this.baseOffsetX + this.panX;
    this.offsetY = this.baseOffsetY + this.panY;
  }

  resize() {
    if (!this.worldData) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 1000;
    // On mobile screens, give enough vertical touch real estate (at least 270px)
    const height =
      width < 640
        ? Math.max(270, Math.round(width * 0.65))
        : Math.round(width * (this.worldData.h / this.worldData.w) + 20);

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    this.baseScale = width / this.worldData.w;
    this.baseOffsetX = 0;
    this.baseOffsetY = Math.max(10, (height - this.worldData.h * this.baseScale) / 2);
    this.updateTransform();
    this.render();
  }

  zoomIn(factor: number = 1.25, focal?: [number, number]): number {
    const nextZoom = Math.min(5.0, this.zoomLevel * factor);
    if (focal) {
      const [fx, fy] = focal;
      const prevScale = this.scale;
      const newScale = this.baseScale * nextZoom;
      this.panX = fx - (fx - (this.baseOffsetX + this.panX)) * (newScale / prevScale) - this.baseOffsetX;
      this.panY = fy - (fy - (this.baseOffsetY + this.panY)) * (newScale / prevScale) - this.baseOffsetY;
    }
    this.zoomLevel = nextZoom;
    this.updateTransform();
    this.render();
    return Math.round(this.zoomLevel * 100);
  }

  zoomOut(factor: number = 1.25, focal?: [number, number]): number {
    const nextZoom = Math.max(0.8, this.zoomLevel / factor);
    if (focal) {
      const [fx, fy] = focal;
      const prevScale = this.scale;
      const newScale = this.baseScale * nextZoom;
      this.panX = fx - (fx - (this.baseOffsetX + this.panX)) * (newScale / prevScale) - this.baseOffsetX;
      this.panY = fy - (fy - (this.baseOffsetY + this.panY)) * (newScale / prevScale) - this.baseOffsetY;
    }
    this.zoomLevel = nextZoom;
    this.updateTransform();
    this.render();
    return Math.round(this.zoomLevel * 100);
  }

  resetZoom(): number {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
    this.render();
    return 100;
  }

  pan(dx: number, dy: number) {
    this.panX += dx;
    this.panY += dy;
    this.updateTransform();
    this.render();
  }

  getZoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  render() {
    if (!this.worldData) return;
    const ctx = this.ctx;
    const t = this.theme;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Ocean Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Base Landmasses
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const baseLineWidth = 0.85 / this.scale;

    for (const f of this.worldData.f) {
      const isSelected = this.selectedCountry === f.i;
      const isHovered = this.hoveredCountry === f.i;
      const isBangladesh = f.i === "BGD";
      const path = this.paths[f.i];
      if (!path) continue;

      if (isBangladesh) {
        // Distinctive Home Styling
        ctx.fillStyle = "#059669"; // Emerald Home
        ctx.fill(path);
        ctx.strokeStyle = "#F5B041"; // Gold border
        ctx.lineWidth = 1.6 / this.scale;
        ctx.stroke(path);
      } else if (this.showProfileColors && this.countryFundingTiers[f.i]) {
        // Profile Match Coloring Mode
        const tier = this.countryFundingTiers[f.i];
        const color = FUNDING_COLORS[tier] || FUNDING_COLORS.other;
        ctx.fillStyle = isSelected || isHovered ? t.v1 : color.fill;
        ctx.fill(path);
        ctx.strokeStyle = isSelected || isHovered ? "#FFFFFF" : color.stroke;
        ctx.lineWidth = (isSelected || isHovered ? 1.6 : 0.85) / this.scale;
        ctx.stroke(path);
      } else if (isSelected) {
        // Selected Country - Gradient Fill
        const grad = ctx.createLinearGradient(0, 0, this.worldData.w, this.worldData.h);
        grad.addColorStop(0, t.v1);
        grad.addColorStop(1, t.v2);

        if (t.glow) {
          ctx.save();
          ctx.shadowColor = t.glow;
          ctx.shadowBlur = 14 * this.dpr;
          ctx.fillStyle = grad;
          ctx.fill(path);
          ctx.restore();
        }

        ctx.fillStyle = grad;
        ctx.fill(path);
        ctx.strokeStyle = t.vStroke;
        ctx.lineWidth = 1.4 / this.scale;
        ctx.stroke(path);
      } else if (isHovered) {
        // Hovered Country
        ctx.fillStyle = t.v1;
        ctx.fill(path);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5 / this.scale;
        ctx.stroke(path);
      } else if (this.activeFundingFilter !== "all") {
        const geo = this.geoIndexData[f.i];
        let hasTier = false;
        if (geo) {
          if (this.activeFundingFilter === "fully_funded") hasTier = (geo.fullyFundedCount || 0) > 0;
          else if (this.activeFundingFilter === "full_tuition") hasTier = (geo.fullTuitionCount || 0) > 0;
          else if (this.activeFundingFilter === "partial") hasTier = (geo.partialCount || 0) > 0;
        }

        if (hasTier) {
          const tierColor = FUNDING_COLORS[this.activeFundingFilter] || FUNDING_COLORS.fully_funded;
          ctx.fillStyle = tierColor.fill;
          ctx.fill(path);
          ctx.strokeStyle = tierColor.stroke;
          ctx.lineWidth = 1.3 / this.scale;
          ctx.stroke(path);
        } else {
          // Dimmed non-matching countries
          ctx.fillStyle = t.id === "daylight" || t.id === "emerald" ? "#EEF2F6" : "#1B2836";
          ctx.fill(path);
          ctx.strokeStyle = t.stroke;
          ctx.lineWidth = 0.5 / this.scale;
          ctx.stroke(path);
        }
      } else {
        // Default Country
        ctx.fillStyle = t.land;
        ctx.fill(path);
        ctx.strokeStyle = t.stroke;
        ctx.lineWidth = baseLineWidth;
        ctx.stroke(path);
      }
    }

    // 3. Tiny Countries Marker Dots (Singapore, Malta, Cyprus, etc.)
    for (const f of this.worldData.f) {
      if (!f.sm || f.i === "BGD") continue;
      const isSelected = this.selectedCountry === f.i;
      const isHovered = this.hoveredCountry === f.i;
      const geo = this.geoIndexData[f.i];

      // Only draw special marker dots for tiny states/islands that actually have scholarships
      const hasScholarships = geo && (geo.totalCount || 0) > 0;
      if (!hasScholarships) {
        continue;
      }

      let dotColor = t.dot;
      let dotSize = 4;
      if (this.activeFundingFilter !== "all" && geo) {
        let hasTier = false;
        if (this.activeFundingFilter === "fully_funded") hasTier = (geo.fullyFundedCount || 0) > 0;
        else if (this.activeFundingFilter === "full_tuition") hasTier = (geo.fullTuitionCount || 0) > 0;
        else if (this.activeFundingFilter === "partial") hasTier = (geo.partialCount || 0) > 0;
        if (hasTier) {
          dotColor = FUNDING_COLORS[this.activeFundingFilter].fill;
          dotSize = 5.5;
        } else {
          if (!isSelected && !isHovered) continue;
          dotColor = "rgba(100, 116, 139, 0.4)";
          dotSize = 2.8;
        }
      }

      ctx.beginPath();
      ctx.arc(f.c[0], f.c[1], isSelected || isHovered ? 6 : dotSize, 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? t.v1 : dotColor;
      ctx.fill();
      ctx.lineWidth = 1.5 / this.scale;
      ctx.strokeStyle = isSelected || isHovered ? "#FFFFFF" : t.halo;
      ctx.stroke();
    }

    // 4. Dhaka Home Marker & Radar Pulse
    this.drawDhakaOrigin(ctx, t);

    // 5. Flight Arc from Dhaka to Selected Destination
    if (this.selectedCountry && this.selectedCountry !== "BGD") {
      const dest = this.worldData.f.find((x) => x.i === this.selectedCountry);
      if (dest) {
        this.drawFlightArc(ctx, DHAKA_COORD, dest.c, t);
      }
    }

    // 6. Top 100 University Pin Layer (when in Top 100 mode)
    if (this.mode === "top100") {
      this.drawUniversityPins(ctx, t);
    }


    ctx.restore(); // restore map transform
    ctx.restore(); // restore canvas dpr
  }

  drawDhakaOrigin(ctx: CanvasRenderingContext2D, t: ThemeTokens) {
    const [dx, dy] = DHAKA_COORD;

    // Outer radar ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx, dy, 9 + Math.sin(this.arcPulsePhase) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245, 176, 65, 0.6)";
    ctx.lineWidth = 1.8 / this.scale;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#E11D48"; // Crimson Red center (BD Flag reference)
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5 / this.scale;
    ctx.stroke();

    // BD Origin Label
    ctx.font = `bold ${Math.max(9, Math.round(11 / this.scale))}px Inter, sans-serif`;
    ctx.fillStyle = "#F5B041";
    ctx.textAlign = "center";
    ctx.fillText("BD", dx, dy - 10);
    ctx.restore();
  }

  drawFlightArc(
    ctx: CanvasRenderingContext2D,
    p0: [number, number],
    p2: [number, number],
    t: ThemeTokens,
  ) {
    const [x0, y0] = p0;
    const [x2, y2] = p2;

    // Calculate midpoint
    const mx = (x0 + x2) / 2;
    const my = (y0 + y2) / 2;
    const dist = Math.hypot(x2 - x0, y2 - y0);

    // Control point curved upwards for a graceful flight arc
    const arcHeight = Math.min(60, dist * 0.28);
    const cx = mx;
    const cy = my - arcHeight;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x2, y2);

    // Glowing dashed line
    ctx.strokeStyle = t.v1;
    ctx.lineWidth = 1.6 / this.scale;
    ctx.setLineDash([4 / this.scale, 4 / this.scale]);
    ctx.lineDashOffset = -this.arcPulsePhase * 2;
    ctx.stroke();

    // Destination target dot
    ctx.beginPath();
    ctx.arc(x2, y2, 4, 0, Math.PI * 2);
    ctx.fillStyle = t.v1;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.2 / this.scale;
    ctx.stroke();

    ctx.restore();
  }

  drawUniversityPins(ctx: CanvasRenderingContext2D, t: ThemeTokens) {
    ctx.save();
    for (const u of this.universities) {
      const isHovered = this.hoveredUniversity?.name === u.name;
      const [ux, uy] = u.c;

      // Outer glow for hovered
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(ux, uy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 176, 65, 0.4)";
        ctx.fill();
      }

      // Pin circle
      ctx.beginPath();
      ctx.arc(ux, uy, isHovered ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = u.rank <= 10 ? "#E11D48" : u.rank <= 50 ? "#F5B041" : "#3498DB";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5 / this.scale;
      ctx.stroke();

      // Mini rank number
      ctx.font = `bold ${Math.max(7, Math.round(8 / this.scale))}px Inter, sans-serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${u.rank}`, ux, uy);
    }
    ctx.restore();
  }

  hitTest(
    clientX: number,
    clientY: number,
  ): { country: CountryFeature | null; university: University | null; isHome: boolean } {
    if (!this.worldData) return { country: null, university: null, isHome: false };

    const rect = this.canvas.getBoundingClientRect();
    const clickX = ((clientX - rect.left) / rect.width) * (this.canvas.width / this.dpr);
    const clickY = ((clientY - rect.top) / rect.height) * (this.canvas.height / this.dpr);

    // Invert canvas transform
    const mx = (clickX - this.offsetX) / this.scale;
    const my = (clickY - this.offsetY) / this.scale;

    // 1. Check Dhaka Home
    const distToDhaka = Math.hypot(mx - DHAKA_COORD[0], my - DHAKA_COORD[1]);
    if (distToDhaka < 14) {
      const bgd = this.worldData.f.find((x) => x.i === "BGD") || null;
      return { country: bgd, university: null, isHome: true };
    }

    // 2. Check Top 100 University Pins (if active)
    if (this.mode === "top100") {
      for (const u of this.universities) {
        if (Math.hypot(mx - u.c[0], my - u.c[1]) < 10) {
          const c = this.worldData.f.find((x) => x.i === u.iso) || null;
          return { country: c, university: u, isHome: false };
        }
      }
    }

    // 3. Check Polygons with isPointInPath FIRST (Exact country match)
    for (const f of this.worldData.f) {
      const path = this.paths[f.i];
      if (path && this.ctx.isPointInPath(path, mx, my)) {
        return { country: f, university: null, isHome: f.i === "BGD" };
      }
    }

    // 4. Check Tiny Islands / Microstates (f.sm) for clicks in open water
    // Only check countries with f.sm that actually have scholarships
    let bestTiny: CountryFeature | null = null;
    let minD = 10;
    for (const f of this.worldData.f) {
      if (f.sm && f.i !== "BGD") {
        const geo = this.geoIndexData[f.i];
        const hasScholarships = geo && (geo.totalCount || 0) > 0;
        if (!hasScholarships) continue;

        const d = Math.hypot(mx - f.c[0], my - f.c[1]);
        if (d < minD) {
          minD = d;
          bestTiny = f;
        }
      }
    }
    if (bestTiny) return { country: bestTiny, university: null, isHome: false };

    // 5. Tolerance sampling for mobile touch imprecision (within ~4-5px contact radius)
    const tolerance = 4.5 / this.scale;
    const offsets = [
      [tolerance, 0],
      [-tolerance, 0],
      [0, tolerance],
      [0, -tolerance],
      [tolerance, tolerance],
      [-tolerance, -tolerance],
    ];
    for (const [ox, oy] of offsets) {
      for (const f of this.worldData.f) {
        const path = this.paths[f.i];
        if (path && this.ctx.isPointInPath(path, mx + ox, my + oy)) {
          return { country: f, university: null, isHome: f.i === "BGD" };
        }
      }
    }

    return { country: null, university: null, isHome: false };
  }

  setSelectedCountry(iso: string | null) {
    this.selectedCountry = iso === "BGD" ? null : iso;
    this.hoveredCountry = null;
    this.render();
  }

  selectCountry(iso: string | null) {
    if (iso === "BGD") return; // Non-selectable as study abroad destination
    this.selectedCountry = this.selectedCountry === iso ? null : iso;
    this.hoveredCountry = null;
    this.render();
  }

  clearSelection() {
    this.selectedCountry = null;
    this.hoveredCountry = null;
    this.render();
  }

  startAnimation() {
    if (this.animationFrameId) return;
    const loop = () => {
      this.arcPulsePhase = (this.arcPulsePhase + 0.05) % (Math.PI * 2);
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Export card generator for social sharing ("Show-Off" Card)
  generateExportCard(options: {
    studentName: string;
    targetIntake: string;
    totalScholarshipsCount: number;
    totalUnivCount: number;
    featuredScholarship?: {
      name: string;
      country: string;
      coverage: string;
      studyLevel?: string;
    };
  }): string {
    if (!this.worldData) return "";

    const expW = 1200;
    const expH = 750;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = expW;
    offCanvas.height = expH;
    const ctx = offCanvas.getContext("2d");
    if (!ctx) return "";

    const t = this.theme;

    // 1. Dark Luxurious Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, expW, expH);

    // Decorative gradient overlay
    const radial = ctx.createRadialGradient(expW / 2, expH / 2, 50, expW / 2, expH / 2, 600);
    radial.addColorStop(0, "rgba(245, 176, 65, 0.08)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, expW, expH);

    // 2. Header Branding
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Inter, sans-serif";
    ctx.fillText(`${options.studentName || "My"} Global Study Abroad Blueprint`, 60, 65);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 16px Inter, sans-serif";
    ctx.fillText(
      `Curated Target Destinations for ${options.targetIntake} • Powered by EG Scholarships`,
      60,
      95,
    );

    // 3. Render World Map in Middle
    const mapScale = (expW - 120) / this.worldData.w;
    const mapOffsetX = 60;
    const mapOffsetY = 130;

    ctx.save();
    ctx.translate(mapOffsetX, mapOffsetY);
    ctx.scale(mapScale, mapScale);

    // Land
    for (const f of this.worldData.f) {
      const path = this.paths[f.i];
      if (!path) continue;
      const isSelected = this.selectedCountry === f.i;

      if (f.i === "BGD") {
        ctx.fillStyle = "#059669";
        ctx.fill(path);
      } else if (isSelected) {
        ctx.fillStyle = "#F5B041";
        ctx.fill(path);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.2 / mapScale;
        ctx.stroke(path);
      } else {
        ctx.fillStyle = t.land;
        ctx.fill(path);
        ctx.strokeStyle = t.stroke;
        ctx.lineWidth = 0.8 / mapScale;
        ctx.stroke(path);
      }
    }

    // BD Origin Marker & Label on Export Card
    const [x0, y0] = DHAKA_COORD;
    ctx.beginPath();
    ctx.arc(x0, y0, 4 / mapScale, 0, Math.PI * 2);
    ctx.fillStyle = "#E11D48";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.4 / mapScale;
    ctx.stroke();

    ctx.font = `bold ${Math.round(11 / mapScale)}px Inter, sans-serif`;
    ctx.fillStyle = "#F5B041";
    ctx.textAlign = "center";
    ctx.fillText("BD", x0, y0 - 8 / mapScale);

    // Flight arc from BD
    if (this.selectedCountry && this.selectedCountry !== "BGD") {
      const dest = this.worldData.f.find((x) => x.i === this.selectedCountry);
      if (dest) {
        const [x2, y2] = dest.c;
        const mx = (x0 + x2) / 2;
        const my = (y0 + y2) / 2;
        const dist = Math.hypot(x2 - x0, y2 - y0);
        const arcHeight = Math.min(50, dist * 0.25);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(mx, my - arcHeight, x2, y2);
        ctx.strokeStyle = "#F5B041";
        ctx.lineWidth = 2 / mapScale;
        ctx.stroke();

        // Destination target pin
        ctx.beginPath();
        ctx.arc(x2, y2, 4 / mapScale, 0, Math.PI * 2);
        ctx.fillStyle = "#F5B041";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.2 / mapScale;
        ctx.stroke();

        ctx.font = `bold ${Math.round(10 / mapScale)}px Inter, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(dest.n, x2, y2 - 8 / mapScale);
      }
    }
    ctx.restore();

    // 3.5 Floating Scholarship Window on Export Card (Social Media Story/Feed Anchor)
    if (options.featuredScholarship) {
      const cardX = 60;
      const cardY = expH - 265;
      const cardW = 440;
      const cardH = 150;

      // Card Background (Glassmorphism)
      ctx.fillStyle = "rgba(22, 34, 47, 0.94)";
      ctx.beginPath();
      // Safe rounded rect for all canvas contexts
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();

      ctx.strokeStyle = "rgba(245, 176, 65, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top badge
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cardX + 16, cardY + 14, 110, 22, 6);
      } else {
        ctx.rect(cardX + 16, cardY + 14, 110, 22);
      }
      ctx.fill();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.stroke();

      ctx.fillStyle = "#10B981";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🟢 TARGET AWARD", cardX + 24, cardY + 29);

      // Country tag
      ctx.fillStyle = "#94A3B8";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText(`📍 ${options.featuredScholarship.country}`, cardX + 140, cardY + 29);

      // Title
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px Inter, sans-serif";
      const titleText =
        options.featuredScholarship.name.length > 40
          ? options.featuredScholarship.name.slice(0, 38) + "..."
          : options.featuredScholarship.name;
      ctx.fillText(titleText, cardX + 16, cardY + 62);

      // Coverage & details
      ctx.fillStyle = "#F5B041";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText(`💰 Coverage: ${options.featuredScholarship.coverage}`, cardX + 16, cardY + 90);

      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 12px Inter, sans-serif";
      ctx.fillText(
        `🎓 Level: ${options.featuredScholarship.studyLevel || "All Programs"}  •  Intake: ${options.targetIntake}`,
        cardX + 16,
        cardY + 112,
      );

      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText("✓ Verified by EG Scholarships Desk", cardX + 16, cardY + 134);
    }

    // 4. Bottom Statistics Ribbon
    const bottomY = expH - 95;
    ctx.fillStyle = "rgba(30, 44, 58, 0.9)";
    ctx.fillRect(60, bottomY, expW - 120, 75);

    ctx.strokeStyle = "rgba(245, 176, 65, 0.4)";
    ctx.strokeRect(60, bottomY, expW - 120, 75);

    if (options.featuredScholarship) {
      ctx.fillStyle = "#F5B041";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText(
        `🎯 Target Goal: ${options.featuredScholarship.name} (${options.featuredScholarship.country})`,
        85,
        bottomY + 30,
      );

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "500 14px Inter, sans-serif";
      ctx.fillText(
        `💰 Funding: ${options.featuredScholarship.coverage}  •  🎓 Level: ${options.featuredScholarship.studyLevel || "All Levels"}  •  Intake: ${options.targetIntake}`,
        85,
        bottomY + 56,
      );
    } else {
      ctx.fillStyle = "#F5B041";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText(
        `🎯 Study Abroad Blueprint  •  💰 ${options.totalScholarshipsCount} Verified Awards  •  🏛️ ${options.totalUnivCount} Top Universities`,
        85,
        bottomY + 45,
      );
    }

    // EG Watermark
    ctx.fillStyle = "#64748B";
    ctx.font = "500 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Excellence Global Consultancy  •  egconsultancy.com.bd", expW - 80, bottomY + 45);

    return offCanvas.toDataURL("image/png");
  }
}
