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

function respondToStagingBuild(request, response) {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const isStagingHost = (request.headers.host || "").startsWith("scholarships-stage.egconsultancy.com.bd");
  if (!isStagingHost || requestUrl.pathname !== "/__staging-build") return false;

  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  });
  response.end(JSON.stringify({
    buildId: readBuildFile("BUILD_ID"),
    deployment: readBuildFile("DEPLOY_COMMIT"),
  }));
  return true;
}

async function respondToStagingHealth(request, response) {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const isStagingHost = (request.headers.host || "").startsWith("scholarships-stage.egconsultancy.com.bd");
  if (!isStagingHost || requestUrl.pathname !== "/__staging-health") return false;

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
      databaseConnected = true;
      counts = { students: Number(students.count), applications: Number(applications.count) };
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

app
  .prepare()
  .then(() => {
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
