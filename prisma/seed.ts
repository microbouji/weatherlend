import { seedDatabase } from "../lib/seed-data";
import { prisma } from "../lib/prisma";

// `prisma db seed` entry point. The actual content lives in
// lib/seed-data.ts so demo hosting can reuse it (lib/bootstrap.ts).

seedDatabase()
  .then(() => {
    console.log("Seeded: 7 phenomena, 3 sizes, 6 users, 18 offers, 6 requests, 2 bookings.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
