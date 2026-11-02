// Master Export Engine for High-Resolution Scholarship Map / Guide Poster
import type { ScholarshipItem } from "../page";
import type { CountryBrief, CountryFeature, WorldData } from "@/components/compass/MapEngine";
import { createPosterModel } from "./posterModel";
import { preloadImage } from "./posterUtils";
import { renderPosterHeader } from "./components/PosterHeader";
import { renderScholarshipHero } from "./components/ScholarshipHero";
import { renderFactBar } from "./components/FactBar";
import { renderInfoCards } from "./components/InfoCard";
import { renderScholarshipRouteMap } from "./components/ScholarshipRouteMap";
import { renderPosterFooter } from "./components/PosterFooter";

export async function generateScholarshipCardImage(
  item: ScholarshipItem,
  countryBrief?: CountryBrief,
  countryFeature?: CountryFeature,
  worldData?: WorldData | null,
  lang: "bn" | "en" = "en"
): Promise<string> {
  if (typeof document === "undefined") return "";

  // 1. Build Normalised Poster Model
  const model = createPosterModel(item, countryBrief, countryFeature, lang);

  // 2. Preload Graphic Assets & Wait for Fonts
  const [logoImg, qrImg, heroImg, univLogoImg] = await Promise.all([
    preloadImage("/egc-logo.png"),
    preloadImage("/images/poster/maps-portal-qr.png"),
    model.providerHeroImageUrl ? preloadImage(model.providerHeroImageUrl) : Promise.resolve(null),
    model.providerLogoUrl ? preloadImage(model.providerLogoUrl) : Promise.resolve(null),
  ]);

  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font readiness times out
    }
  }

  // 3. Initialize High-Resolution 4:5 Portrait Canvas (1200 x 1500 px)
  const canvas = document.createElement("canvas");
  const width = 1200;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return "";

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 4. Render Layout Sections Sequentially Top to Bottom
  // Section A: Header (Canvas base, double frame, logo, title, verification badge)
  renderPosterHeader(ctx, width, height, model, logoImg);

  // Section B: Destination & University Hero (Flag, funding badge, navy card, hero photo, univ logo)
  renderScholarshipHero(ctx, width, model, heroImg, univLogoImg);

  // Section C: Essential Facts Bar (Program Level, Deadline, Award Status)
  renderFactBar(ctx, width, model, 585);

  // Section D: Three Core Information Cards (Cost & Tuition, Benefits, Eligibility & Strategy)
  renderInfoCards(ctx, width, model, 685);

  // Section E: QR Card + Route Map (Scannable QR, Bangladesh -> Destination curved flight route)
  renderScholarshipRouteMap(ctx, width, model, qrImg, worldData, 978);

  // Section F & G: Portal CTA Strip & Company Contact Footer
  renderPosterFooter(ctx, width, model, 1338);

  return canvas.toDataURL("image/png");
}
