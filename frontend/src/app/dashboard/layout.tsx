import Link from "next/link";
import { getAllSports } from "@/lib/sports";

/**
 * Legacy player-rankings dashboard. Shares the global header; keeps a sport
 * sidebar so existing /dashboard/sports/* routes continue to work unchanged.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sports = getAllSports();

  return (
    <div className="site-container flex flex-col px-4 py-6 sm:px-6 md:flex-row md:gap-8 md:py-8">
      <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 md:hidden">
        <div className="flex min-w-max gap-1 border-b border-slate-800">
          {sports.map((s) => (
            <Link
              key={s.code}
              href={`/dashboard/sports/${s.code}`}
              className="flex h-10 shrink-0 items-center px-3 text-sm text-slate-400 hover:text-white"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <aside className="hidden w-52 shrink-0 md:block">
        <nav className="sticky top-20" aria-label="Sports">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Player rankings</p>
          <ul className="border-l border-slate-800">
            {sports.map((s) => (
              <li key={s.code}>
                <Link
                  href={`/dashboard/sports/${s.code}`}
                  className="-ml-px block border-l border-transparent py-1.5 pl-3 text-sm text-slate-400 hover:border-slate-500 hover:text-white"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
