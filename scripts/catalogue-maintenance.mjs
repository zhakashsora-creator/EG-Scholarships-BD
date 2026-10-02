import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 86_400_000;
const DEFAULT_INPUT = resolve("app/data/scholarships.json");

function cleanDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const parsed = new Date(`${match[1]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(earlier, later) {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

function normalizedKey(record) {
  return [record.name, record.provider, record.country]
    .map((value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .join("|");
}

export function validateCatalogue(records) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const identityKeys = new Map();
  const required = ["id", "name", "provider", "country", "officialSource"];

  if (!Array.isArray(records) || records.length === 0) {
    return { errors: ["Catalogue must be a non-empty array."], warnings };
  }

  records.forEach((record, index) => {
    const label = record?.id || `row ${index + 1}`;
    for (const field of required) {
      if (typeof record?.[field] !== "string" || !record[field].trim()) errors.push(`${label}: missing ${field}`);
    }
    if (record?.id) {
      if (ids.has(record.id)) errors.push(`${label}: duplicate id`);
      ids.add(record.id);
    }
    if (record?.officialSource && !/^https:\/\//i.test(record.officialSource)) errors.push(`${label}: officialSource must use HTTPS`);
    if (record?.verifiedAt && !cleanDate(record.verifiedAt)) warnings.push(`${label}: verifiedAt is not an ISO date`);
    const identity = normalizedKey(record ?? {});
    if (identity !== "||") {
      const first = identityKeys.get(identity);
      if (first) warnings.push(`${label}: possible duplicate of ${first}`);
      else identityKeys.set(identity, label);
    }
  });

  return { errors, warnings };
}

export function buildVerificationQueue(records, options = {}) {
  const now = options.now ?? new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = options.limit ?? 12;
  const country = String(options.country ?? "").trim().toLowerCase();
  const sourceCounts = new Map();
  for (const record of records) sourceCounts.set(record.officialSource, (sourceCounts.get(record.officialSource) ?? 0) + 1);

  return records
    .filter((record) => !country || String(record.country).toLowerCase().includes(country))
    .map((record) => {
      const reasons = [];
      let priority = 0;
      const verified = cleanDate(record.verifiedAt);
      const ageDays = verified ? Math.max(0, daysBetween(verified, today)) : null;
      if (ageDays === null) {
        priority += 65;
        reasons.push("verification date missing or invalid");
      } else if (ageDays >= 90) {
        priority += 50;
        reasons.push(`last verified ${ageDays} days ago`);
      } else if (ageDays >= 60) {
        priority += 35;
        reasons.push(`last verified ${ageDays} days ago`);
      } else if (ageDays >= 30) {
        priority += 15;
        reasons.push(`last verified ${ageDays} days ago`);
      }

      const deadline = cleanDate(record.deadline);
      const deadlineDays = deadline ? daysBetween(today, deadline) : null;
      if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 45) {
        priority += 75;
        reasons.push(`deadline in ${deadlineDays} days`);
      } else if (deadlineDays !== null && deadlineDays > 45 && deadlineDays <= 120) {
        priority += 50;
        reasons.push(`deadline in ${deadlineDays} days`);
      } else if (deadlineDays !== null && deadlineDays < 0 && !/closed|past|historical/i.test(record.status ?? "")) {
        priority += 55;
        reasons.push(`stored deadline passed ${Math.abs(deadlineDays)} days ago but status is not closed`);
      }

      if (!/high/i.test(record.confidence ?? "")) {
        priority += 15;
        reasons.push("confidence is not high");
      }
      if (/open|upcoming|urgent|recurring/i.test(record.status ?? "")) priority += 10;
      if ((sourceCounts.get(record.officialSource) ?? 0) > 1) {
        priority += 5;
        reasons.push("official source is shared by multiple catalogue records");
      }

      return {
        id: record.id,
        name: record.name,
        provider: record.provider,
        country: record.country,
        officialSource: record.officialSource,
        deadline: record.deadline || null,
        status: record.status || null,
        verifiedAt: record.verifiedAt || null,
        confidence: record.confidence || null,
        ageDays,
        priority,
        reasons: reasons.length ? reasons : ["routine rotation"],
      };
    })
    .sort((a, b) => b.priority - a.priority || (b.ageDays ?? 10_000) - (a.ageDays ?? 10_000) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

async function checkOfficialSource(item) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const headers = { "User-Agent": "EG-Scholarships-Catalogue-Monitor/1.0" };
  try {
    let response = await fetch(item.officialSource, { method: "HEAD", redirect: "follow", signal: controller.signal, headers });
    if ([403, 405, 429, 501].includes(response.status)) {
      response = await fetch(item.officialSource, { method: "GET", redirect: "follow", signal: controller.signal, headers });
    }
    const outcome = response.ok
      ? "reachable"
      : [401, 403, 429].includes(response.status)
        ? "blocked"
        : [404, 410].includes(response.status)
          ? "missing"
          : response.status >= 500
            ? "server-error"
            : "unexpected";
    return { ...item, linkCheck: { ok: response.ok, outcome, status: response.status, finalUrl: response.url, checkedAt: new Date().toISOString() } };
  } catch (error) {
    return { ...item, linkCheck: { ok: false, outcome: "network-error", status: null, error: error instanceof Error ? error.message : String(error), checkedAt: new Date().toISOString() } };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkQueue(queue, concurrency = 3) {
  const results = new Array(queue.length);
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const index = cursor++;
      results[index] = await checkOfficialSource(queue[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

function parseArgs(args) {
  const value = (name) => args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  return {
    input: resolve(value("input") || DEFAULT_INPUT),
    output: value("output") ? resolve(value("output")) : null,
    limit: Math.max(1, Math.min(100, Number(value("limit") || 12))),
    country: value("country") || "",
    checkLinks: args.includes("--check-links"),
  };
}

export async function runCatalogueMaintenance(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const records = JSON.parse(await readFile(options.input, "utf8"));
  const validation = validateCatalogue(records);
  let queue = buildVerificationQueue(records, options);
  if (options.checkLinks) queue = await checkQueue(queue);
  const report = {
    generatedAt: new Date().toISOString(),
    input: options.input,
    recordCount: records.length,
    validation,
    queue,
    policy: "Review findings against official sources before editing or importing catalogue data.",
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) await writeFile(options.output, output, "utf8");
  else process.stdout.write(output);
  if (validation.errors.length) process.exitCode = 1;
  return report;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(fileURLToPath(import.meta.url))) await runCatalogueMaintenance();
