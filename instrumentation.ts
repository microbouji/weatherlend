// Runs once per server boot, before any request is handled.
// Guarantees the database is migrated + seeded before pages render
// (layouts do NOT block pages in the App Router, so awaiting inside
// app/layout.tsx alone is not enough). See lib/bootstrap.ts.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDemoDatabase } = await import("./lib/bootstrap");
    await ensureDemoDatabase();
  }
}
