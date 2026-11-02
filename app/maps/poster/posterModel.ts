// Normalised Data Model for EG Scholarships Downloadable Export Card
import type { ScholarshipItem } from "../page";
import type { CountryBrief, CountryFeature } from "@/components/compass/MapEngine";

export type ScholarshipPosterModel = {
  scholarshipTitle: string;
  providerName: string;
  providerLogoUrl?: string;
  providerHeroImageUrl?: string;

  destinationName: string;
  destinationNameBn?: string;
  destinationIso: string;

  fundingType: string;
  fundingTier: "fully_funded" | "full_tuition" | "partial" | "other";

  programLevel: string;
  deadline: string;
  awardStatus: string;

  costTuitionSummary: string;
  benefitsSummary: string;
  eligibilityStrategySummary: string;

  verifiedSourceUrl?: string;
  isVerified: boolean;

  // Geographic coordinates for route mapping
  originName: string;
  originIso: string;
  originCentroid: [number, number]; // in world.json 1000x444.7 coordinates (Bangladesh: [741.4, 155.3])

  destinationCentroid?: [number, number]; // in world.json 1000x444.7 coordinates

  portalMapUrl: string;
};

// Bangladesh origin centroid in world.json coordinate space
export const BANGLADESH_CENTROID: [number, number] = [741.4, 155.3];

// Format ISO date strings (e.g. 2026-12-01 -> 01 Dec 2026)
export function formatPosterDeadline(rawDeadline?: string): string {
  if (!rawDeadline) return "Upcoming Intake";
  const trimmed = rawDeadline.trim();
  
  // Check ISO format YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = isoMatch[1];
    const month = months[parseInt(isoMatch[2], 10) - 1] || isoMatch[2];
    const day = isoMatch[3];
    return `${day} ${month} ${year}`;
  }

  // If already textual or rolling
  return trimmed;
}

// Curated university assets lookup (e.g. University of Groningen)
export function resolveUniversityAssets(provider: string, iso: string): { heroImageUrl?: string; logoUrl?: string } {
  const norm = provider.toLowerCase();
  
  // University of Groningen (Rijksuniversiteit Groningen)
  if (norm.includes("groningen") || (iso === "NLD" && norm.includes("bleumink"))) {
    return {
      heroImageUrl: "/images/poster/groningen-hero.png",
      logoUrl: undefined, // Logo card is cleanly integrated in the verified campus asset
    };
  }

  // Fallback: Return undefined to trigger the elegant academic gradient hero card
  return {};
}

export function createPosterModel(
  item: ScholarshipItem,
  countryBrief?: CountryBrief,
  countryFeature?: CountryFeature,
  lang: "bn" | "en" = "en"
): ScholarshipPosterModel {
  // Determine funding tier text
  let fundingType = "PARTIAL SCHOLARSHIP";
  if (item.fundingTier === "fully_funded") {
    fundingType = "FULLY FUNDED SCHOLARSHIP";
  } else if (item.fundingTier === "full_tuition") {
    fundingType = "100% TUITION WAIVER";
  }

  const destinationIso = countryFeature?.i || "NLD";
  const destinationName = countryFeature?.n || countryBrief?.nameEn || "Destination";
  const destinationNameBn = countryFeature?.b || countryBrief?.nameBn || "";

  // Content summaries
  const costText =
    item.overallSummary?.cost ||
    (countryBrief ? `Subsidized under ${countryBrief.tuition.slice(0, 110)}` : "Tuition fee exemption and academic coverage specified by university statutes.");

  const benefitText =
    item.overallSummary?.benefits ||
    item.coverage ||
    (countryBrief ? `Living cost coverage ${countryBrief.livingCost.slice(0, 80)}. Includes health insurance and round-trip allowance.` : "Includes living stipend, academic allowances, and university support.");

  const eligText =
    item.overallSummary?.other ||
    (countryBrief ? `Academic evaluation (min CGPA ${countryBrief.cgpa}). Proof of English proficiency (${countryBrief.ielts}).` : "Recognized bachelor's degree, strong academic merit credentials, and language requirements.");

  // University hero & logo assets
  const assets = resolveUniversityAssets(item.provider, destinationIso);

  return {
    scholarshipTitle: item.name,
    providerName: item.provider,
    providerHeroImageUrl: assets.heroImageUrl,
    providerLogoUrl: assets.logoUrl,

    destinationName,
    destinationNameBn: destinationNameBn || undefined,
    destinationIso,

    fundingType,
    fundingTier: item.fundingTier,

    programLevel: item.studyLevel || "All Levels",
    deadline: formatPosterDeadline(item.deadline),
    awardStatus: item.status || "Active Verified",

    costTuitionSummary: costText,
    benefitsSummary: benefitText,
    eligibilityStrategySummary: eligText,

    verifiedSourceUrl: item.officialSource,
    isVerified: true,

    originName: "Bangladesh",
    originIso: "BGD",
    originCentroid: BANGLADESH_CENTROID,
    destinationCentroid: countryFeature?.c,

    portalMapUrl: "https://scholarships.egconsultancy.com.bd/maps",
  };
}
