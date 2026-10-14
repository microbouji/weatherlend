import { PrismaClient } from "@prisma/client";

// One shared client across hot-reloads in dev; a fresh one per server
// instance in production. Standard Prisma + Next.js pattern.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
