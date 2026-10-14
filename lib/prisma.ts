import { PrismaClient } from "@prisma/client";

// Resolved BEFORE the client is constructed: the client captures the URL at
// construction, so fixing it later (e.g. in instrumentation) is too late.
//
// The committed .env points at file:./dev.db for zero-config local setup —
// but that file is deployed to Vercel too, where the repo filesystem is
// read-only (SQLITE_CANTOPEN, error 14). On such hosts a relative file: URL
// is therefore rewritten to /tmp. Explicitly configured /tmp (or non-file)
// URLs always win.
function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (process.env.VERCEL) {
    if (configured && (configured.startsWith("file:/tmp/") || !configured.startsWith("file:"))) {
      return configured;
    }
    return "file:/tmp/weatherlend.db";
  }
  return configured ?? "file:./dev.db";
}

process.env.DATABASE_URL = resolveDatabaseUrl();

// One shared client across hot-reloads in dev; a fresh one per server
// instance in production. Standard Prisma + Next.js pattern.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
