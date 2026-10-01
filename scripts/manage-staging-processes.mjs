import { readFile, readlink, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const expectedRoot = "/home/egcoccrw/repositories/eg-scholarships-app";
const shouldTerminate = process.argv.includes("--terminate");

if (process.platform !== "linux" || resolve(process.cwd()) !== expectedRoot) {
  throw new Error("This helper may run only from the Namecheap staging application root.");
}

const ownUid = process.getuid?.();
const observed = [];
const candidates = [];

for (const entry of await readdir("/proc")) {
  if (!/^\d+$/.test(entry)) continue;
  const pid = Number(entry);
  if (pid === process.pid || pid === process.ppid) continue;

  try {
    const status = await readFile(`/proc/${pid}/status`, "utf8");
    const uid = Number(status.match(/^Uid:\s+(\d+)/m)?.[1]);
    if (uid !== ownUid) continue;

    const command = (await readFile(`/proc/${pid}/cmdline`, "utf8"))
      .replaceAll("\0", " ")
      .trim();
    const cwd = await readlink(`/proc/${pid}/cwd`).catch(() => "");
    const looksLikeNode = /(node|lsnode\.js|server-stage\.cjs|server\.cjs|server\.js)/i.test(command);
    if (looksLikeNode || cwd === expectedRoot || command.includes(expectedRoot)) {
      observed.push({ pid, command, cwd });
    }

    const belongsToPortal =
      (cwd === expectedRoot || command.includes(expectedRoot)) &&
      /(lsnode\.js|server-stage\.cjs|server\.cjs|server\.js)/.test(command);

    if (belongsToPortal) candidates.push({ pid, command, cwd });
  } catch {
    // Processes can exit while /proc is being inspected.
  }
}

console.log(
  JSON.stringify({ mode: shouldTerminate ? "terminate" : "inspect", observed, candidates }, null, 2),
);

if (shouldTerminate) {
  for (const candidate of candidates) process.kill(candidate.pid, "SIGTERM");
}
