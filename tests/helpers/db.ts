import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Maakt per testsuite een verse SQLite-database aan en wijst de lazy
// prisma-singleton ernaartoe via DATABASE_URL. Aanroepen vóór de eerste query.
export function useTestDb(): () => void {
  const dir = mkdtempSync(path.join(tmpdir(), "urenlijst-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  // Geen --force-reset: het bestand is gloednieuw, er valt niets te resetten.
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  process.env.DATABASE_URL = url;
  return () => rmSync(dir, { recursive: true, force: true });
}
