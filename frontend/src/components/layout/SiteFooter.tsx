import Link from "next/link";
import { getAllSports } from "@/lib/sports";
import { DEFAULT_SPORT } from "@/lib/nav";

export function SiteFooter() {
  const sports = getAllSports();
  return (
    <footer className="mt-16 border-t border-slate-800">
      <div className="site-container grid gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-4">
        <div>
          <p className="text-base font-black tracking-tight text-white">
            D3<span className="text-blue-500">Rank</span>
          </p>
          <p className="mt-2 max-w-xs text-slate-500">
            Player ratings, team rankings, and conference strength for NCAA Division III, built from
            official conference statistics.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Basketball</p>
          <ul className="mt-2 space-y-1.5 text-slate-400">
            <li><Link className="hover:text-white" href={`/rankings/teams/${DEFAULT_SPORT}`}>Team rankings</Link></li>
            <li><Link className="hover:text-white" href={`/rankings/players/${DEFAULT_SPORT}`}>Player rankings</Link></li>
            <li><Link className="hover:text-white" href={`/rankings/conferences/${DEFAULT_SPORT}`}>Conference rankings</Link></li>
            <li><Link className="hover:text-white" href={`/stats/${DEFAULT_SPORT}`}>Stat leaders</Link></li>
            <li><Link className="hover:text-white" href={`/teams/${DEFAULT_SPORT}`}>All teams</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All sports</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-400">
            {sports.map((s) => (
              <li key={s.code}>
                <Link className="hover:text-white" href={`/rankings/players/${s.code}`}>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site</p>
          <ul className="mt-2 space-y-1.5 text-slate-400">
            <li><Link className="hover:text-white" href="/search">Search</Link></li>
            <li><Link className="hover:text-white" href="/rankings#methodology">Methodology</Link></li>
            <li><Link className="hover:text-white" href="/#pricing">D3Rank Pro</Link></li>
            <li><Link className="hover:text-white" href="/dashboard/settings">Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="site-container px-4 py-4 text-xs text-slate-600 sm:px-6">
          © {new Date().getFullYear()} D3Rank. Statistics sourced from official conference websites. Not
          affiliated with the NCAA.
        </div>
      </div>
    </footer>
  );
}
