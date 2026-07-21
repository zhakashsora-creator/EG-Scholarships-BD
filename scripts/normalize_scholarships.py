from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    Path(r"C:\Users\User\Downloads\Bangladesh_Funding_Opportunities_Sep2026_Jan2027.xlsx"),
    Path(r"C:\Users\User\Downloads\Bangladesh_Funding_Opportunities_Verified_2026-07-16.xlsx"),
]


def clean(value: object) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    text = text.replace("�", "–")
    text = re.sub(r"\s+", " ", text)
    if text.endswith(" 00:00:00"):
        text = text[:10]
    return text


def first_records() -> list[dict[str, str]]:
    df = pd.read_excel(FILES[0], sheet_name="Opportunities")
    records: list[dict[str, str]] = []
    for index, row in df.iterrows():
        records.append(
            {
                "id": f"INTAKE-{index + 1:03d}",
                "name": clean(row.get("Opportunity")),
                "provider": clean(row.get("Provider / institution")),
                "country": clean(row.get("Country")),
                "destination": clean(row.get("Destination")),
                "category": clean(row.get("Category")),
                "studyLevel": clean(row.get("Study level")),
                "intake": clean(row.get("Target intake")),
                "fundingSummary": clean(row.get("Funding summary")),
                "coverage": clean(row.get("Coverage")),
                "bangladeshEligibility": clean(row.get("Bangladesh eligibility")),
                "academicCriteria": clean(row.get("Academic / experience criteria")),
                "englishRequirement": clean(row.get("English requirement")),
                "subjectRestrictions": clean(row.get("Subject restrictions")),
                "deadline": clean(row.get("Deadline")),
                "deadlineTimezone": clean(row.get("Deadline timezone")),
                "status": clean(row.get("Status")),
                "applicationRoute": clean(row.get("Application route")),
                "separateAdmission": clean(row.get("Separate admission?")),
                "documents": clean(row.get("Key documents / steps")),
                "officialSource": clean(row.get("Official source")),
                "verifiedAt": clean(row.get("Last verified")),
                "confidence": clean(row.get("Confidence")),
                "priority": clean(row.get("Priority")),
                "sourceDataset": "Next intake opportunities",
            }
        )
    return records


def verified_records() -> list[dict[str, str]]:
    df = pd.read_excel(FILES[1], sheet_name="Opportunities", header=4)
    records: list[dict[str, str]] = []
    for index, row in df.iterrows():
        if not clean(row.get("Opportunity name")):
            continue
        records.append(
            {
                "id": clean(row.get("ID")) or f"VERIFIED-{index + 1:03d}",
                "name": clean(row.get("Opportunity name")),
                "provider": clean(row.get("Institution")) or clean(row.get("Provider")),
                "country": clean(row.get("Country")),
                "destination": clean(row.get("Country")),
                "category": clean(row.get("Category")),
                "studyLevel": clean(row.get("Study level")),
                "intake": clean(row.get("Likely intake")),
                "fundingSummary": " · ".join(
                    item
                    for item in [
                        clean(row.get("Funding extent")),
                        clean(row.get("Tuition coverage")),
                        clean(row.get("Stipend / living support")),
                    ]
                    if item
                ),
                "coverage": clean(row.get("Funding extent")),
                "bangladeshEligibility": clean(row.get("Bangladesh eligibility")),
                "academicCriteria": clean(row.get("Academic baseline")),
                "englishRequirement": clean(row.get("English requirement")),
                "subjectRestrictions": clean(row.get("Subject / field")),
                "deadline": clean(row.get("Current or last deadline")),
                "deadlineTimezone": clean(row.get("Deadline details / time zone")),
                "status": clean(row.get("Status as of 2026-07-16")),
                "applicationRoute": clean(row.get("Application route")),
                "separateAdmission": clean(row.get("Separate admission required")),
                "documents": clean(row.get("Key additional criteria")),
                "officialSource": clean(row.get("Official source")),
                "verifiedAt": clean(row.get("Last verified")),
                "confidence": clean(row.get("Confidence")),
                "priority": clean(row.get("Priority band")),
                "sourceDataset": "Verified recurring database",
            }
        )
    return records


def main() -> None:
    merged: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    for record in first_records() + verified_records():
        key = (
            record["name"].casefold(),
            record["provider"].casefold(),
            record["country"].casefold(),
        )
        if not record["name"] or key in seen:
            continue
        seen.add(key)
        merged.append(record)

    merged.sort(key=lambda item: (item["priority"], item["country"], item["name"]))
    output = ROOT / "app" / "data" / "scholarships.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"records": len(merged), "output": str(output)}))


if __name__ == "__main__":
    main()
