import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { seedDatabase } from "./seed-data";

// Demo-hosting safety net, called once per server boot from app/layout.tsx.
//
// Local development is unaffected: after `npm run setup` the database is
// populated and this is a single cheap COUNT query. It only does work when
// the database file exists but is empty (fresh ephemeral instance) or has
// no tables yet (first boot on hosts without a persistent disk, e.g. Vercel):
// then it applies the checked-in migrations and loads the sample data, so
// the demo link works with zero manual steps on the server.

let pending: Promise<void> | null = null;

export function ensureDemoDatabase(): Promise<void> {
  pending ??= init().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function init(): Promise<void> {
  try {
    if ((await prisma.user.count()) > 0) return;
  } catch (error) {
    // P2021 = table missing: fresh database file, migrate it, then continue.
    const missingTable =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
    if (!missingTable) throw error;
    runMigrations();
  }
  await seedDatabase();
}

function runMigrations(): void {
  // Prefer the bundled CLI (fast); fall back to fetching it (demo hosts
  // typically don't ship node_modules to serverless functions).
  const bundled = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  try {
    if (existsSync(bundled)) {
      execFileSync(process.execPath, [bundled, "migrate", "deploy"], { stdio: "inherit" });
      return;
    }
  } catch {
    // Fall through to npx.
  }
  execFileSync("npx", ["--yes", "prisma", "migrate", "deploy"], { stdio: "inherit" });
}
