import { searchAthletes } from "@/lib/athletes";
import Link from "next/link";
import { OvrBadge } from "@/components/athlete/OvrBadge";
import { isPro } from "@/lib/auth";
import { PRO_PRICE_SUMMARY } from "@/lib/billing";

export const metadata = {
  title: "Search athletes | D3Rank",
  description: "Find NCAA Division III athletes by name across D3Rank sports.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sport?: string }>;
}) {
  const { q = "", sport } = await searchParams;
  const pro = await isPro();

  if (!pro) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-white">Search athletes</h1>
          <p className="mt-2 text-slate-400">NCAA Division III player discovery</p>
        </header>
        <div className="rounded-2xl border-2 border-slate-600 bg-slate-900/70 p-10 text-center">
          <p className="font-medium text-slate-300">Search is a Pro feature.</p>
          <p className="mt-2 text-slate-400">
            Unlock player search, full lists, OVR, and rank for {PRO_PRICE_SUMMARY}.
          </p>
          <Link
            href="/#pricing"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
          >
            Get Pro
          </Link>
        </div>
      </div>
    );
  }

  const results = q.trim().length >= 2 ? await searchAthletes(q, sport) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Search athletes</h1>
        <p className="mt-2 text-slate-400">NCAA Division III player discovery</p>
      </header>

      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Player name…"
          className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"
        />
        <select
          name="sport"
          defaultValue={sport ?? ""}
          className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white"
        >
          <option value="">All sports</option>
          <option value="mbb">Men&apos;s Basketball</option>
          <option value="baseball">Baseball</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
        >
          Search
        </button>
      </form>

      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="text-sm text-slate-500">Enter at least 2 characters.</p>
      )}

      <ul className="divide-y divide-slate-700 rounded-2xl border border-slate-700 bg-slate-900/50">
        {results.length === 0 && q.trim().length >= 2 && (
          <li className="px-6 py-8 text-center text-slate-500">No athletes found.</li>
        )}
        {results.map((a) => {
          const top = a.seasons[0];
          return (
            <li key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <Link
                  href={`/athletes/${a.slug}`}
                  className="text-lg font-semibold text-white hover:text-blue-400"
                >
                  {a.displayName}
                </Link>
                <p className="text-sm text-slate-500">
                  {top?.season.sport.label}
                  {top?.team?.name ? ` · ${top.team.name}` : ""}
                  {top?.globalRank != null ? ` · #${top.globalRank}` : ""}
                </p>
              </div>
              <OvrBadge rating={top?.rating} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
