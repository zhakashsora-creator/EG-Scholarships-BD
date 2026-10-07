// Versioned cPanel entry point. A Git pull can promote the bundled webpack
// build before Passenger loads the application, avoiding a separate File
// Manager extraction step on shared hosting.
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");

const archiveName = existsSync(join(__dirname, "next-build-9c3d4be.zip"))
  ? "next-build-9c3d4be.zip"
  : existsSync(join(__dirname, "next-build-1a5b122.zip"))
  ? "next-build-1a5b122.zip"
  : existsSync(join(__dirname, "next-build-8cbb79a.zip"))
  ? "next-build-8cbb79a.zip"
  : existsSync(join(__dirname, "next-build-aee593e.zip"))
  ? "next-build-aee593e.zip"
  : existsSync(join(__dirname, "next-build-60235db.zip"))
  ? "next-build-60235db.zip"
  : existsSync(join(__dirname, "next-build-0bfc55b.zip"))
  ? "next-build-0bfc55b.zip"
  : existsSync(join(__dirname, "namecheap-linux-build.zip"))
  ? "namecheap-linux-build.zip"
  : "next-build-803a1bf.zip";
const expectedDeployment = "9c3d4be7c9991266d269fc4613e1c85f1791a10a Linux hosting build";

const archivePath = join(__dirname, archiveName);
const deploymentMarker = join(__dirname, ".next", "DEPLOY_COMMIT");

let promotionLog = [];

try {
  const activeDeployment = existsSync(deploymentMarker)
    ? readFileSync(deploymentMarker, "utf8").trim()
    : "";

  promotionLog.push(`active: "${activeDeployment}", expected: "${expectedDeployment}", archive: "${archiveName}", exists: ${existsSync(archivePath)}`);

  if (activeDeployment !== expectedDeployment && existsSync(archivePath)) {
    try {
      execFileSync("/usr/bin/unzip", ["-o", archivePath, "-d", __dirname], { stdio: "ignore" });
      promotionLog.push("unzipped with /usr/bin/unzip");
    } catch (e1) {
      try {
        const { execSync } = require("node:child_process");
        execSync(`unzip -o "${archivePath}" -d "${__dirname}"`, { stdio: "ignore" });
        promotionLog.push("unzipped with PATH unzip");
      } catch (e2) {
        promotionLog.push(`unzip failed: ${e1.message} | ${e2.message}`);
      }
    }
  }
} catch (error) {
  promotionLog.push(`outer error: ${error.message}`);
  console.error("Staging build promotion failed; keeping the active build.", error);
}

writeFileSync(
  join(__dirname, "staging-startup-marker.json"),
  JSON.stringify({
    entry: "server-stage.cjs",
    archive: archiveName,
    startedAt: new Date().toISOString(),
    promotionLog,
  }),
);

require("./server.cjs");
