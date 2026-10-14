import { cookies } from "next/headers";
import { prisma } from "./prisma";

// No authentication in this prototype (tender: out of scope). The "current
// user" is whoever the demo-user switcher picked, stored in a cookie.
// TODO(follow-up): replace with a real session (Auth.js / Supabase Auth).

export const USER_COOKIE = "weatherlend_user";

export async function getCurrentUserId(): Promise<number> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  const id = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isInteger(id)) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user.id;
  }
  // No (valid) cookie yet: deterministic fallback to the first demo user.
  const first = await prisma.user.findFirst({ orderBy: { id: "asc" } });
  if (!first) throw new Error("No users in the database — did you run `npm run db:seed`?");
  return first.id;
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
