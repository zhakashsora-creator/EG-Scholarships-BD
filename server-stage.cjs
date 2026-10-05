// Versioned cPanel entry point. A Git pull can promote the bundled webpack
// build before Passenger loads the application, avoiding a separate File
// Manager extraction step on shared hosting.
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");

const archiveName = existsSync(join(__dirname, "next-build-0bfc55b.zip"))
  ? "next-build-0bfc55b.zip"
  : existsSync(join(__dirname, "namecheap-linux-build.zip"))
  ? "namecheap-linux-build.zip"
  : "next-build-803a1bf.zip";
const expectedDeployment = "0bfc55b9e440fceaf750f50fcf9a9ec9630b8ca3 Linux hosting build";
const archivePath = join(__dirname, archiveName);
const deploymentMarker = join(__dirname, ".next", "DEPLOY_COMMIT");

try {
  const activeDeployment = existsSync(deploymentMarker)
    ? readFileSync(deploymentMarker, "utf8").trim()
    : "";

  if (activeDeployment !== expectedDeployment && existsSync(archivePath)) {
    execFileSync("/usr/bin/unzip", ["-t", archivePath], { stdio: "ignore" });
    execFileSync("/usr/bin/unzip", ["-o", archivePath, "-d", __dirname], {
      stdio: "inherit",
    });
  }
} catch (error) {
  // Keep the last working build online. The diagnostic endpoint will continue
  // to report its old deployment marker, making a failed promotion visible.
  console.error("Staging build promotion failed; keeping the active build.", error);
}

writeFileSync(
  join(__dirname, "staging-startup-marker.json"),
  JSON.stringify({
    entry: "server-stage.cjs",
    archive: archiveName,
    startedAt: new Date().toISOString(),
  }),
);

require("./server.cjs");
