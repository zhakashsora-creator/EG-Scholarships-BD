const { createServer } = require("node:http");
const { join } = require("node:path");
const { existsSync, readFileSync } = require("node:fs");

const applicationDirectory = __dirname;

const localEnvironmentFile = join(applicationDirectory, ".env.production.local");
if (existsSync(localEnvironmentFile)) {
  process.loadEnvFile(localEnvironmentFile);
}

const next = require("next");
const mysql = require("mysql2/promise");

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev: false, hostname, port, dir: applicationDirectory });
const handle = app.getRequestHandler();

function readBuildFile(name) {
  try {
    return readFileSync(join(applicationDirectory, ".next", name), "utf8").trim();
  } catch {
    return null;
  }
}

function isScholarshipPortalHost(hostHeader) {
  const hostname = (hostHeader || "").split(":", 1)[0].toLowerCase();
  return hostname === "scholarships.egconsultancy.com.bd"
    || hostname === "scholarships-stage.egconsultancy.com.bd";
}

function respondToStagingBuild(request, response) {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (!isScholarshipPortalHost(request.headers.host) || requestUrl.pathname !== "/__staging-build") return false;

  let marker = null;
  try {
    marker = JSON.parse(readFileSync(join(applicationDirectory, "staging-startup-marker.json"), "utf8"));
  } catch {}

  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  });
  response.end(JSON.stringify({
    buildId: readBuildFile("BUILD_ID"),
    deployment: readBuildFile("DEPLOY_COMMIT"),
    marker,
  }));
  return true;
}

async function respondToStagingHealth(request, response) {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (!isScholarshipPortalHost(request.headers.host) || requestUrl.pathname !== "/__staging-health") return false;

  const authConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const databaseConfigured = Boolean(process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD);
  let databaseConnected = false;
  let counts = null;
  let connection;

  if (databaseConfigured) {
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      const [[students]] = await connection.query("SELECT COUNT(*) AS count FROM students");
      const [[applications]] = await connection.query("SELECT COUNT(*) AS count FROM applications");
      const [[scholarships]] = await connection.query("SELECT COUNT(*) AS count FROM scholarship_catalogue WHERE active = 1");
      databaseConnected = true;
      counts = {
        students: Number(students.count),
        applications: Number(applications.count),
        scholarships: Number(scholarships.count),
      };
    } catch {
      databaseConnected = false;
    } finally {
      await connection?.end();
    }
  }

  const ok = authConfigured && databaseConnected;
  response.writeHead(ok ? 200 : 503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify({ ok, authConfigured, databaseConfigured, databaseConnected, counts }));
  return true;
}


async function syncScholarshipCatalogueIfDatabaseConnected() {
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) return;
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    try {
      await connection.query("ALTER TABLE catalogue_awards ADD COLUMN IF NOT EXISTS overall_summary TEXT");
    } catch {}

    const catalogueFile = join(applicationDirectory, "app", "data", "scholarships.json");
    if (!existsSync(catalogueFile)) return;
    const records = JSON.parse(readFileSync(catalogueFile, "utf8"));

    const sql = `INSERT INTO scholarship_catalogue
      (id, name, provider, country, funding_category, official_source, deadline, status, verified_at, confidence, source_dataset, data_json, active, source_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE name=VALUES(name), provider=VALUES(provider), country=VALUES(country), funding_category=VALUES(funding_category), official_source=VALUES(official_source), deadline=VALUES(deadline), status=VALUES(status), verified_at=VALUES(verified_at), confidence=VALUES(confidence), source_dataset=VALUES(source_dataset), data_json=VALUES(data_json), active=1, source_order=VALUES(source_order), updated_at=CURRENT_TIMESTAMP(3)`;
    const awardSql = `INSERT INTO catalogue_awards
      (id, name, provider, country, destination, category, funding_category, funding_summary, coverage,
        bangladesh_eligibility, official_source, source_dataset, overall_summary, active, source_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE name=VALUES(name), provider=VALUES(provider), country=VALUES(country),
        destination=VALUES(destination), category=VALUES(category), funding_category=VALUES(funding_category),
        funding_summary=VALUES(funding_summary), coverage=VALUES(coverage), bangladesh_eligibility=VALUES(bangladesh_eligibility),
        official_source=VALUES(official_source), source_dataset=VALUES(source_dataset), overall_summary=VALUES(overall_summary), active=1,
        source_order=VALUES(source_order), updated_at=CURRENT_TIMESTAMP(3)`;
    const programmeSql = `INSERT INTO catalogue_programmes
      (id, scholarship_id, name, study_level, subject_restrictions, academic_criteria, english_requirement,
        separate_admission, documents, official_source, is_primary, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE scholarship_id=VALUES(scholarship_id), name=VALUES(name), study_level=VALUES(study_level),
        subject_restrictions=VALUES(subject_restrictions), academic_criteria=VALUES(academic_criteria),
        english_requirement=VALUES(english_requirement), separate_admission=VALUES(separate_admission),
        documents=VALUES(documents), official_source=VALUES(official_source), is_primary=1, active=1,
        updated_at=CURRENT_TIMESTAMP(3)`;
    const cycleSql = `INSERT INTO catalogue_cycles
      (id, scholarship_id, intake, deadline, deadline_timezone, status, application_route, verified_at,
        confidence, priority, is_current, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE scholarship_id=VALUES(scholarship_id), intake=VALUES(intake), deadline=VALUES(deadline),
        deadline_timezone=VALUES(deadline_timezone), status=VALUES(status), application_route=VALUES(application_route),
        verified_at=VALUES(verified_at), confidence=VALUES(confidence), priority=VALUES(priority), is_current=1,
        active=1, updated_at=CURRENT_TIMESTAMP(3)`;

    function fundingCategory(r) {
      const text = `${r.coverage || ""} ${r.fundingSummary || ""}`.toLowerCase();
      if (/self-funded|self funded/.test(text)) return "Self-funded";
      if (/fully funded|full tuition.*living|tuition.*stipend|stipend.*tuition/.test(text)) return "Fully funded";
      if (/full tuition|100% tuition|tuition waiver/.test(text)) return "Full tuition";
      if (/discount|fee reduction/.test(text)) return "Tuition discount";
      if (/partial|contribution|stipend|grant|allowance/.test(text)) return "Partial funding";
      return "Other";
    }

    await connection.beginTransaction();
    for (const [index, r] of records.entries()) {
      const scholarshipId = (r.id || "").trim();
      const overallSummary = typeof r.overallSummary === "object" && r.overallSummary !== null
        ? JSON.stringify(r.overallSummary)
        : (r.overallSummary || "").trim();
      await connection.execute(sql, [
        scholarshipId, (r.name || "").trim(), (r.provider || "").trim(), (r.country || "").trim(),
        fundingCategory(r), (r.officialSource || "").trim(), (r.deadline || "").trim() || null,
        (r.status || "").trim() || null, (r.verifiedAt || "").trim() || null, (r.confidence || "").trim() || null,
        (r.sourceDataset || "").trim() || null, JSON.stringify(r), index
      ]);
      await connection.execute(awardSql, [
        scholarshipId, (r.name || "").trim(), (r.provider || "").trim(), (r.country || "").trim(),
        (r.destination || r.country || "").trim(), (r.category || "").trim(), fundingCategory(r),
        (r.fundingSummary || "").trim(), (r.coverage || "").trim(), (r.bangladeshEligibility || "").trim(),
        (r.officialSource || "").trim(), (r.sourceDataset || "").trim() || null, overallSummary || null, index
      ]);
      await connection.execute(programmeSql, [
        `${scholarshipId}:programme`, scholarshipId, (r.name || "").trim(), (r.studyLevel || "").trim(),
        (r.subjectRestrictions || "").trim(), (r.academicCriteria || "").trim(), (r.englishRequirement || "").trim(),
        (r.separateAdmission || "").trim(), (r.documents || "").trim(), (r.officialSource || "").trim()
      ]);
      await connection.execute(cycleSql, [
        `${scholarshipId}:cycle`, scholarshipId, (r.intake || "").trim(), (r.deadline || "").trim() || null,
        (r.deadlineTimezone || "").trim(), (r.status || "").trim(), (r.applicationRoute || "").trim(),
        (r.verifiedAt || "").trim() || null, (r.confidence || "").trim(), (r.priority || "").trim()
      ]);
    }
    await connection.commit();
    console.log(`Synced ${records.length} catalogue records to MariaDB`);
  } catch (err) {
    console.error("Startup catalogue sync error:", err);
    try { await connection?.rollback(); } catch {}
  } finally {
    try { await connection?.end(); } catch {}
  }
}


app
  .prepare()
  .then(async () => {
    await syncScholarshipCatalogueIfDatabaseConnected();
    createServer(async (request, response) => {
      if (respondToStagingBuild(request, response)) return;
      if (await respondToStagingHealth(request, response)) return;
      return handle(request, response);
    }).listen(port, hostname, () => {
      console.log(`EG Scholarships is listening on ${hostname}:${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start EG Scholarships", error);
    process.exitCode = 1;
  });
