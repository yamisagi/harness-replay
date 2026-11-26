import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const apiDir = path.join(rootDir, "app", "api");
const backupDir = path.join(rootDir, ".api-export-backup");

function run() {
  const hasApiDir = fs.existsSync(apiDir);
  if (hasApiDir) {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.renameSync(apiDir, backupDir);
  }

  try {
    for (const staleTypesDir of [
      path.join(rootDir, ".next", "types"),
      path.join(rootDir, ".next", "dev", "types"),
    ]) {
      if (fs.existsSync(staleTypesDir)) {
        fs.rmSync(staleTypesDir, { recursive: true, force: true });
      }
    }
    execSync("npx next build", {
      stdio: "inherit",
      env: { ...process.env, STATIC_EXPORT: "true" },
    });
  } finally {
    if (hasApiDir && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, apiDir);
    }
  }
}

run();
