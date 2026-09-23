// Versioned cPanel entry point. Changing the configured startup filename forces
// Passenger to discard a stale cached startup module after a build promotion.
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");

writeFileSync(
  join(__dirname, "staging-startup-marker.json"),
  JSON.stringify({ entry: "server-stage.cjs", startedAt: new Date().toISOString() }),
);

require("./server.cjs");
