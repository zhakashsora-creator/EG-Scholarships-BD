import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const scholarshipsPath = join(process.cwd(), "app", "data", "scholarships.json");
const scholarships = JSON.parse(readFileSync(scholarshipsPath, "utf8"));

console.log(`Starting total count: ${scholarships.length}`);

// Comprehensive list of redundant duplicate IDs to remove
const duplicateIdsToRemove = new Set([
  // Malaysia
  "MY-002",             // Duplicate of MY-004 (Malaysian International Scholarship - MIS)
  // Indonesia
  "ID-001",             // Duplicate of ID-003 (KNB Scholarship)
  // Thailand
  "TH-004",             // Duplicate of TH-005 (AIT Royal Thai Government Fellowship)
  // Taiwan
  "TW-001",             // Duplicate of TW-004 (Taiwan ICDF)
  "TW-003",             // Duplicate of TW-002 (Taiwan MOE)
  // UAE
  "AE-001",             // Duplicate of AE-029 (MBZUAI Full Scholarship)
  // Singapore
  "SG-001",             // Duplicate of GLB-SG-001 (SINGA)
  "SG-007",             // Duplicate of GLB-SG-001 (SINGA)
  "SG-008",             // Duplicate of BD-059 (NUS Research Scholarship)
  // Saudi Arabia
  "SA-016",             // Duplicate of GLB-SA-001 (KAUST Fellowship)
  "BD-062",             // Duplicate of GLB-SA-001 (KAUST Fellowship)
  // United States
  "US-001",             // Duplicate of GLB-US-001 (Fulbright Foreign Student Program)
  "US-0055",            // Duplicate of INTAKE-001 (UNM Amigo Scholarship)
  // Turkey
  "TR-001",             // Duplicate of GLB-TR-001 (Türkiye Bursları)
  // Czechia
  "CZ-001",             // Duplicate of EUR-CZ-001 (Czech Govt)
  "EU-0089",            // Duplicate of EUR-CZ-001 (Czech Govt Developing Countries)
  // Belgium
  "BE-001",             // Duplicate of EUR-BE-001 (Master Mind Flanders)
  "EU-0079",            // Duplicate of EUR-BE-001 (Master Mind Scholarship)
  "EU-0081",            // Duplicate of EUR-BE-002 (VLIR-UOS ICP Connect)
  // Hungary
  "HU-001",             // Duplicate of EUR-HU-001 (Stipendium Hungaricum)
  "BD-010",             // Duplicate of EUR-HU-001 (Stipendium Hungaricum)
  "INTAKE-030",         // Duplicate of EUR-HU-001 (Stipendium Hungaricum)
  "EU-0058",            // Duplicate of EUR-HU-001 (Stipendium Hungaricum)
  // United Kingdom
  "GB-001",             // Duplicate of GLB-UK-001 (Chevening)
  "BD-001",             // Duplicate of GLB-UK-001 (Chevening)
  "INTAKE-025",         // Duplicate of GLB-UK-001 (Chevening)
  "BD-002",             // Duplicate of GLB-UK-002 (Commonwealth Master's)
  "GB-002",             // Duplicate of GLB-UK-002 (Commonwealth Master's & PhD)
  "BD-035",             // Duplicate of INTAKE-013 (Exeter Bangladesh)
  "BD-034",             // Duplicate of INTAKE-012 (Sussex Bangladesh)
  "ATTACHED-UK-0005",   // Duplicate of UK-0005 (Coventry)
  "ATTACHED-UK-0040",   // Duplicate of UK-0040 (Salford)
  "ATTACHED-UK-0007",   // Duplicate of UK-0007 (Greenwich)
  "ATTACHED-UK-0046",   // Duplicate of UK-0046 (Birkbeck)
  "ATTACHED-UK-0051",   // Duplicate of UK-0051 (South Wales)
  // Canada
  "BD-040",             // Duplicate of CA-001 (Lester B Pearson Toronto)
  "BD-038",             // Duplicate of CA-002 (McCall MacBain McGill)
  // Netherlands
  "EU-0038",            // Duplicate of EUR-NL-002 (Eric Bleumink Groningen)
  "EU-0041",            // Duplicate of BD-046 (Twente UTS)
  "EU-0031",            // Duplicate of EUR-NL-001 (NL Scholarship)
  "NL-001",             // Duplicate of EUR-NL-001 (NL Scholarship)
  // Sweden
  "EU-0015",            // Duplicate of EUR-SE-003 (Lund Global)
  "SE-001",             // Duplicate of EUR-SE-001 (SI Global Professionals)
  "BD-011",             // Duplicate of EUR-SE-001 (SI Global Professionals)
  "INTAKE-028",         // Duplicate of EUR-SE-001 (SI Global Professionals)
  // Switzerland
  "BD-041",             // Duplicate of EUR-CH-002 (ETH Zurich ESOP)
  "CH-001",             // Duplicate of EUR-CH-001 (Swiss ESKAS)
  "BD-015",             // Duplicate of EUR-CH-001 (Swiss ESKAS)
  // Italy
  "INTAKE-037",         // Duplicate of EUR-IT-001 (MAECI)
  "IT-001",             // Duplicate of EUR-IT-001 (MAECI)
  // South Korea
  "KR-001",             // Duplicate of GLB-KR-001 (GKS)
  "BD-022",             // Duplicate of GLB-KR-001 (GKS)
  // France
  "FR-001",             // Duplicate of EUR-FR-001 (Eiffel Scholarship)
  "EU-0047",            // Duplicate of EUR-FR-002 (Sciences Po Emile Boutmy)
  // Finland
  "FI-001",             // Duplicate of EUR-FI-001 (Finland Scholarship)
  "EU-0021",            // Duplicate of EUR-FI-002 (Aalto University)
  // Norway
  "EU-0074",            // Duplicate of EUR-NO-001 (Norway PhD Fellowships)
  // Denmark
  "DK-001",             // Duplicate of EUR-DK-001 (Danish Government Scholarships)
  // Ireland
  "IE-001",             // Duplicate of EUR-IE-001 (GOI-IES)
  "INTAKE-031",         // Duplicate of EUR-IE-001 (GOI-IES)
  "EU-0077",            // Duplicate of EUR-IE-002 (Trinity College Dublin)
  // Poland
  "PL-001",             // Duplicate of EUR-PL-001 (Stefan Banach NAWA)
  "EU-0087",            // Duplicate of EUR-PL-001 (Stefan Banach NAWA)
  // Germany
  "DE-001",             // Duplicate of EUR-DE-001 (DAAD EPOS)
  "EU-0007",            // Duplicate of EUR-DE-004 (Heinrich Böll)
  // Japan
  "JP-001",             // Duplicate of GLB-JP-001 (MEXT Embassy Recommendation)
]);

const cleaned = scholarships.filter((s) => !duplicateIdsToRemove.has(s.id));

console.log(`Pruned ${duplicateIdsToRemove.size} duplicate entries.`);
console.log(`Cleaned scholarship count: ${cleaned.length}`);

// Write back cleaned catalogue
writeFileSync(scholarshipsPath, JSON.stringify(cleaned, null, 2), "utf8");
console.log(`Saved deduplicated catalogue to ${scholarshipsPath}`);
