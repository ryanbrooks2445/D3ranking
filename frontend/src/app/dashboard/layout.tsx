import Link from "next/link";
import { getAllSports } from "@/lib/sports";
import { isPro, getSessionForHeader } from "@/lib/auth";
import { CheckoutButton } from "@/components/CheckoutButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pro, session] = await Promise.all([isPro(), getSessionForHeader()]);
  const loggedIn = !!session?.user?.email;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b-2 border-blue-500/30 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 min-h-[3.5rem] max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:h-16 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-sm">
              D3
            </span>
            Rankings
          </Link>
          <nav className="flex flex-wrap items-center gap-2 sm:gap-6">
            <Link
              href="/"
              className="min-h-[44px] rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-400"
            >
              Rankings
            </Link>
            {loggedIn ? (
              <>
                <span className="hidden max-w-[140px] truncate text-sm text-slate-500 sm:max-w-[160px] sm:inline" title="Signed in">
                  {session?.user?.email}
                </span>
                <SignOutButton className="min-h-[44px] rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:text-white" />
              </>
            ) : (
              <Link
                href="/login"
                className="min-h-[44px] rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:text-white"
              >
                Sign in
              </Link>
            )}
            {pro ? (
              <span className="rounded-md bg-emerald-500/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/40">
                Pro
              </span>
            ) : (
              <CheckoutButton className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500">
                Upgrade
              </CheckoutButton>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile: horizontal sport strip. Desktop: sidebar + main */}
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6 md:flex-row md:gap-0 md:py-8">
        {/* Mobile sport strip: scroll horizontally */}
        <div className="md:hidden -mx-4 mb-4 overflow-x-auto overflow-y-hidden px-4 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex min-w-max gap-2">
            {getAllSports().map((s) => (
              <Link
                key={s.code}
                href={`/dashboard/sports/${s.code}`}
                className="shrink-0 rounded-xl border-2 border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-300 transition active:bg-slate-700 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-24 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-4">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Sports
            </p>
            {getAllSports().map((s) => (
              <Link
                key={s.code}
                href={`/dashboard/sports/${s.code}`}
                className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-700/80 text-xs font-bold text-slate-300">
                  {s.code.toUpperCase().slice(0, 2)}
                </span>
                {s.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 md:pl-8">{children}</main>
      </div>
    </div>
  );
}
