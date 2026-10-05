function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function fundingCategory(record) {
  const text = `${record.coverage || ""} ${record.fundingSummary || ""}`.toLowerCase();
  if (/self-funded|self funded/.test(text)) return "Self-funded";
  if (/fully funded|full tuition.*living|tuition.*stipend|stipend.*tuition/.test(text)) return "Fully funded";
  if (/full tuition|100% tuition|tuition waiver/.test(text)) return "Full tuition";
  if (/discount|fee reduction/.test(text)) return "Tuition discount";
  if (/partial|contribution|stipend|grant|allowance/.test(text)) return "Partial funding";
  return "Other";
}

export function validateCatalogueRecords(records) {
  if (!Array.isArray(records) || records.length === 0) throw new Error("The catalogue must be a non-empty JSON array");
  const ids = new Set();
  for (const [index, record] of records.entries()) {
    for (const field of ["id", "name", "provider", "country", "officialSource"]) {
      if (!clean(record?.[field])) throw new Error(`Record ${index + 1} is missing ${field}`);
    }
    if (ids.has(record.id)) throw new Error(`Duplicate scholarship id: ${record.id}`);
    ids.add(record.id);
    if (!record.officialSource.startsWith("https://")) throw new Error(`${record.id} must use an HTTPS official source`);
  }
  return records;
}

export function normalizeCatalogueRecord(record, sourceOrder = 0) {
  const scholarshipId = clean(record.id);
  return {
    award: {
      id: scholarshipId,
      name: clean(record.name),
      provider: clean(record.provider),
      country: clean(record.country),
      destination: clean(record.destination) || clean(record.country),
      category: clean(record.category),
      fundingCategory: fundingCategory(record),
      fundingSummary: clean(record.fundingSummary),
      coverage: clean(record.coverage),
      bangladeshEligibility: clean(record.bangladeshEligibility),
      officialSource: clean(record.officialSource),
      sourceDataset: clean(record.sourceDataset),
      sourceOrder,
    },
    programme: {
      id: `${scholarshipId}:programme`,
      scholarshipId,
      name: clean(record.name),
      studyLevel: clean(record.studyLevel),
      subjectRestrictions: clean(record.subjectRestrictions),
      academicCriteria: clean(record.academicCriteria),
      englishRequirement: clean(record.englishRequirement),
      separateAdmission: clean(record.separateAdmission),
      documents: clean(record.documents),
      officialSource: clean(record.officialSource),
    },
    cycle: {
      id: `${scholarshipId}:cycle`,
      scholarshipId,
      intake: clean(record.intake),
      deadline: clean(record.deadline),
      deadlineTimezone: clean(record.deadlineTimezone),
      status: clean(record.status),
      applicationRoute: clean(record.applicationRoute),
      verifiedAt: clean(record.verifiedAt),
      confidence: clean(record.confidence),
      priority: clean(record.priority),
    },
  };
}
