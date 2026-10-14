import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAllUsers, getCurrentUserId } from "@/lib/session";
import { ensureDemoDatabase } from "@/lib/bootstrap";
import { getBalance } from "@/lib/loans";
import { UserSwitcher } from "@/components/UserSwitcher";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weatherlend — borrow what the weather asks for",
  description:
    "Community lending for extreme weather. Students lend to each other instead of buying things they need twice a year.",
};

// Every page depends on the demo-user cookie, so nothing here can be
// statically prerendered. (No CDN caching needed for a local prototype.)
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Offers" },
  { href: "/requests", label: "Requests" },
  { href: "/offers/new", label: "Offer an item" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/points", label: "Points" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // No-op locally after `npm run setup`; migrates + seeds on first boot
  // of ephemeral demo hosting (see lib/bootstrap.ts).
  await ensureDemoDatabase();
  const [userId, users] = await Promise.all([getCurrentUserId(), getAllUsers()]);
  const balance = await getBalance(userId);
  const current = users.find((u) => u.id === userId)!;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Weatherlend
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="text-stone-600 hover:text-stone-950">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <UserSwitcher users={users} currentId={userId} />
              <Link
                href="/points"
                className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900"
                title="Your points balance"
              >
                {balance} points
              </Link>
            </div>
          </div>
          <p className="border-t border-stone-100 bg-stone-50 px-4 py-1 text-center text-xs text-stone-500">
            Demo as {current.name} · no login in this prototype — switch user above · nothing here sends real emails
          </p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 bg-white px-4 py-4 text-center text-xs text-stone-500">
          Prototype for a student project. All names, items and point values are examples.
        </footer>
      </body>
    </html>
  );
}
