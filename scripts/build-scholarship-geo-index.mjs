import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const scholarships = JSON.parse(readFileSync("app/data/scholarships.json", "utf8"));
const world = JSON.parse(readFileSync("public/world.json", "utf8"));

const aliasMap = {
  "united kingdom": "GBR",
  "uk": "GBR",
  "united states": "USA",
  "usa": "USA",
  "south korea": "KOR",
  "korea": "KOR",
  "czech republic": "CZE",
  "czechia": "CZE",
  "netherlands": "NLD",
  "russia": "RUS",
  "turkey": "TUR",
  "türkiye": "TUR",
  "uae": "ARE",
  "united arab emirates": "ARE",
  "new zealand": "NZL",
  "saudi arabia": "SAU",
  "hong kong": "CHN",
  "hong kong sar": "CHN",
  "macau": "CHN",
  "taiwan": "TWN",
  "vietnam": "VNM",
  "bosnia and herzegovina": "BIH",
  "brunei darussalam": "BRN",
  "brunei": "BRN",
  "northern cyprus": "CYP",
  "cyprus": "CYP",
  "singapore": "SGP",
  "germany": "DEU",
  "france": "FRA",
  "italy": "ITA",
  "canada": "CAN",
  "australia": "AUS",
  "japan": "JPN",
  "sweden": "SWE",
  "finland": "FIN",
  "denmark": "DNK",
  "norway": "NOR",
  "ireland": "IRL",
  "switzerland": "CHE",
  "austria": "AUT",
  "hungary": "HUN",
  "poland": "POL",
  "belgium": "BEL",
  "spain": "ESP",
  "china": "CHN",
  "malaysia": "MYS",
  "thailand": "THA",
  "indonesia": "IDN",
  "philippines": "PHL",
  "portugal": "PRT",
  "greece": "GRC",
  "estonia": "EST",
  "latvia": "LVA",
  "lithuania": "LTU",
  "slovakia": "SVK",
  "slovenia": "SVN",
  "romania": "ROU",
  "bulgaria": "BGR",
  "croatia": "HRV",
  "malta": "MLT",
  "kazakhstan": "KAZ",
  "kyrgyzstan": "KGZ",
  "azerbaijan": "AZE",
  "egypt": "EGY",
  "morocco": "MAR",
  "serbia": "SRB",
  "cuba": "CUB",
  "pakistan": "PAK",
  "mexico": "MEX",
  "brazil": "BRA",
  "uzbekistan": "UZB",
  "georgia": "GEO",
  "sri lanka": "LKA",
  "mauritius": "MUS",
  "luxembourg": "LUX",
  "belarus": "BLR",
  "bahrain": "BHR",
  "jordan": "JOR",
  "kuwait": "KWT",
  "lebanon": "LBN",
  "oman": "OMN",
  "qatar": "QAT",
  "palestine": "PSE",
  "israel": "ISR",
  "iceland": "ISL"
};

const worldByCode = {};
for (const f of world.f) {
  worldByCode[f.i] = f;
}

const geoIndex = {};

// Helper to determine funding category
function getFundingTier(s) {
  const text = `${s.fundingCategory || ""} ${s.coverage || ""} ${s.fundingSummary || ""}`.toLowerCase();
  if (/fully funded|full tuition.*living|tuition.*stipend|stipend.*tuition|100% funding/.test(text)) return "fully_funded";
  if (/full tuition|100% tuition|tuition waiver|0€ tuition/.test(text)) return "full_tuition";
  if (/discount|partial|grant|allowance|contribution|reduction/.test(text)) return "partial";
  return "other";
}

for (const s of scholarships) {
  const rawCountry = (s.country || "").trim().toLowerCase();
  let iso = aliasMap[rawCountry];

  if (!iso) {
    // try exact match with world.json
    const found = Object.values(worldByCode).find(f => f.n.toLowerCase() === rawCountry);
    if (found) iso = found.i;
  }

  // Multi-European schemes like Erasmus Mundus
  if (!iso && (rawCountry.includes("europe") || rawCountry.includes("multiple"))) {
    iso = "EU";
  }

  if (!iso) iso = "OTHER";

  if (!geoIndex[iso]) {
    geoIndex[iso] = {
      iso,
      countryEn: s.country,
      totalCount: 0,
      fullyFundedCount: 0,
      fullTuitionCount: 0,
      partialCount: 0,
      otherCount: 0,
      scholarshipIds: [],
      studyLevels: new Set(),
      intakes: new Set(),
      items: []
    };
  }

  const entry = geoIndex[iso];
  entry.totalCount++;
  entry.scholarshipIds.push(s.id);
  entry.items.push({
    id: s.id,
    name: s.name,
    provider: s.provider,
    coverage: s.coverage || s.fundingSummary,
    fundingTier: getFundingTier(s),
    studyLevel: s.studyLevel,
    deadline: s.deadline,
    status: s.status,
    officialSource: s.officialSource,
    overallSummary: s.overallSummary
  });

  const tier = getFundingTier(s);
  if (tier === "fully_funded") entry.fullyFundedCount++;
  else if (tier === "full_tuition") entry.fullTuitionCount++;
  else if (tier === "partial") entry.partialCount++;
  else entry.otherCount++;

  if (s.studyLevel) {
    for (const lvl of s.studyLevel.split(/[,\/]/)) {
      const clean = lvl.trim();
      if (clean) entry.studyLevels.add(clean);
    }
  }
}

// Convert Sets to Arrays for JSON serialization
const finalIndex = {};
for (const [key, val] of Object.entries(geoIndex)) {
  finalIndex[key] = {
    ...val,
    studyLevels: Array.from(val.studyLevels),
    intakes: Array.from(val.intakes)
  };
}

const targetPath = join(process.cwd(), "app", "data", "geo-scholarship-index.json");
writeFileSync(targetPath, JSON.stringify(finalIndex, null, 2));
console.log("Successfully generated geo-scholarship-index.json with", Object.keys(finalIndex).length, "geographic clusters.");
