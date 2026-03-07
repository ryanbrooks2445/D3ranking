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
      <header className="sticky top-0 z-10 border-b-2 border-blue-500/30 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
              D3
            </span>
            Rankings
          </Link>
          <nav className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-blue-400"
            >
              Player Rankings
            </Link>
            {loggedIn ? (
              <>
                <span className="hidden max-w-[160px] truncate text-sm text-slate-500 sm:inline" title="Signed in">
                  {session?.user?.email}
                </span>
                <SignOutButton className="text-sm text-slate-400 transition hover:text-white" />
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Sign in
              </Link>
            )}
            {pro ? (
              <span className="rounded-md bg-emerald-500/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/40">
                Pro
              </span>
            ) : (
              <CheckoutButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
                Upgrade
              </CheckoutButton>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-0 px-4 sm:px-6 py-8">
        <aside className="w-60 shrink-0">
          <nav className="sticky top-28 rounded-xl border border-slate-700 bg-slate-900/80 py-4 px-3">
            <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Sports
            </p>
            {getAllSports().map((s) => (
              <Link
                key={s.code}
                href={`/dashboard/sports/${s.code}`}
                className="mb-0.5 flex items-center gap-3 rounded-lg py-2.5 px-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-700/80 text-xs font-bold text-slate-300">
                  {s.code.toUpperCase().slice(0, 2)}
                </span>
                {s.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pl-8">{children}</main>
      </div>
    </div>
  );
}
