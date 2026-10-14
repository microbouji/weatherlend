// Embedded copy of prisma/migrations/20261014105417_init/migration.sql.
//
// Why: serverless demo hosts (Vercel) don't ship the Prisma CLI to their
// functions, so `migrate deploy` can't run at boot there. Applying these
// statements directly through the client needs no CLI, no download and no
// extra boot time. The _prisma_migrations row (with the real sha256
// checksum) keeps `prisma migrate status/deploy` happy afterwards.
//
// If the schema changes: run `prisma migrate dev` locally as usual, then
// copy the new migration.sql statements + meta into STATEMENTS / MIGRATION
// below. Local development never touches this file.

export const MIGRATION = {
  name: "20261014105417_init",
  checksum: "e79d855476515ba0941f19d30e75a606b74dd4bc63915bd85f44522ad1f5a844",
  appliedStepsCount: 1,
} as const;

const TABLES = [
  `CREATE TABLE "Phenomenon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
)`,
  `CREATE TABLE "SizeCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pointsPerDay" INTEGER NOT NULL
)`,
  `CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "neighbourhood" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `CREATE TABLE "Offer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sizeId" INTEGER NOT NULL,
    "neighbourhood" TEXT NOT NULL,
    "availableFrom" DATETIME NOT NULL,
    "availableUntil" DATETIME NOT NULL,
    "photoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "SizeCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`,
  `CREATE TABLE "Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requesterId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "phenomenonId" INTEGER NOT NULL,
    "periodFrom" DATETIME,
    "periodUntil" DATETIME,
    "periodNote" TEXT,
    "neighbourhood" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "fulfillingBookingId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Request_phenomenonId_fkey" FOREIGN KEY ("phenomenonId") REFERENCES "Phenomenon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_fulfillingBookingId_fkey" FOREIGN KEY ("fulfillingBookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
  `CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "offerId" INTEGER NOT NULL,
    "borrowerId" INTEGER NOT NULL,
    "from" DATETIME NOT NULL,
    "to" DATETIME NOT NULL,
    "days" INTEGER NOT NULL,
    "pointsTotal" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE TABLE "LedgerEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" INTEGER,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
  `CREATE TABLE "_OfferToPhenomenon" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_OfferToPhenomenon_A_fkey" FOREIGN KEY ("A") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OfferToPhenomenon_B_fkey" FOREIGN KEY ("B") REFERENCES "Phenomenon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
];

const INDEXES = [
  `CREATE UNIQUE INDEX "Phenomenon_name_key" ON "Phenomenon"("name")`,
  `CREATE UNIQUE INDEX "SizeCategory_key_key" ON "SizeCategory"("key")`,
  `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX "Request_fulfillingBookingId_key" ON "Request"("fulfillingBookingId")`,
  `CREATE INDEX "Booking_offerId_from_to_idx" ON "Booking"("offerId", "from", "to")`,
  `CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt")`,
  `CREATE UNIQUE INDEX "_OfferToPhenomenon_AB_unique" ON "_OfferToPhenomenon"("A", "B")`,
  `CREATE INDEX "_OfferToPhenomenon_B_index" ON "_OfferToPhenomenon"("B")`,
];

export const MIGRATIONS_TABLE = `CREATE TABLE "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
)`;

/** Every DDL statement of the init migration, in order. */
export const SCHEMA_STATEMENTS: readonly string[] = [...TABLES, ...INDEXES];
