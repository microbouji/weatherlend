import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { seedDatabase } from "./seed-data";
import { MIGRATION, MIGRATIONS_TABLE, SCHEMA_STATEMENTS } from "./schema-sql";

// Demo-hosting safety net, called once per server boot from
// instrumentation.ts (and defensively from app/layout.tsx).
//
// Local development is unaffected: after `npm run setup` the database is
// populated and this is a single cheap COUNT query. It only does work when
// the database file exists but is empty (fresh ephemeral instance) or has
// no tables yet (first boot on hosts without a persistent disk, e.g. Vercel):
// then it creates the schema and loads the sample data, so the demo link
// works with zero manual steps on the server.
//
// The schema is applied as embedded SQL (lib/schema-sql.ts) rather than via
// `prisma migrate deploy` because serverless functions don't ship the Prisma
// CLI. The _prisma_migrations row carries the real checksum, so local
// `migrate status/deploy` stays consistent afterwards.

let pending: Promise<void> | null = null;

export function ensureDemoDatabase(): Promise<void> {
  pending ??= init().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

async function init(): Promise<void> {
  // UPLOADS_DIR default lives in lib/photos.ts; the DATABASE_URL default
  // lives in lib/prisma.ts (it must be resolved before the client is
  // constructed — see the comment there).
  console.log(`[weatherlend] boot: DATABASE_URL=${process.env.DATABASE_URL}`);
  try {
    if ((await prisma.user.count()) > 0) {
      console.log("[weatherlend] boot: database already seeded");
      return;
    }
  } catch (error) {
    // P2021 = table missing: fresh database file, create schema, then continue.
    const missingTable =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
    if (!missingTable) throw error;
    console.log("[weatherlend] boot: empty database, creating schema");
    await applyEmbeddedSchema();
  }
  console.log("[weatherlend] boot: seeding sample data");
  await seedDatabase();
  console.log("[weatherlend] boot: ready");
}

/**
 * Runs every statement of the init migration in one transaction (SQLite DDL
 * is transactional: a failure rolls everything back and the next boot
 * retries from scratch), then records the migration as applied.
 */
async function applyEmbeddedSchema(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const statement of SCHEMA_STATEMENTS) {
      await tx.$executeRawUnsafe(statement);
    }
    await tx.$executeRawUnsafe(MIGRATIONS_TABLE);
    await tx.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "applied_steps_count")
        VALUES (${param(randomUUID())}, ${param(MIGRATION.checksum)}, ${param(now())}, ${param(MIGRATION.name)}, '', NULL, ${MIGRATION.appliedStepsCount})`,
    );
  });
}

/** Inline a string literal safely into raw SQL (values only, never identifiers). */
function param(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
