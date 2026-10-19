import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadWorkerEnvironment() {
  const externallySet = new Set(Object.keys(process.env));
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) continue;
    const entries = readFileSync(path, "utf8").split(/\r?\n/);
    for (const entry of entries) {
      const line = entry.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      if (externallySet.has(key)) continue;
      const rawValue = line.slice(separator + 1).trim();
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}

async function main() {
  loadWorkerEnvironment();
  const { runFootballCollectorWorker } = await import("../src/lib/football/worker");
  await runFootballCollectorWorker();
}

main().catch(() => {
  // Do not print environment configuration or request headers on startup errors.
  console.error("Football collector worker failed to start.");
  process.exitCode = 1;
});

