import Link from "next/link";
import { getTrendingAthletes } from "@/lib/athletes";
import { OvrBadge } from "./OvrBadge";

export async function TrendingAthletes({ limit = 8 }: { limit?: number }) {
  let trending: Awaited<ReturnType<typeof getTrendingAthletes>> = [];
  try {
    trending = await getTrendingAthletes(7, limit);
  } catch {
    return null;
  }

  if (trending.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
      <h2 className="text-lg font-bold text-white">Trending players</h2>
      <p className="mt-1 text-sm text-slate-400">Most viewed profiles this week</p>
      <ul className="mt-4 divide-y divide-slate-700/80">
        {trending.map(({ athlete, views }) => {
          const top = athlete.seasons[0];
          return (
            <li key={athlete.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <Link
                  href={`/athletes/${athlete.slug}`}
                  className="font-semibold text-white hover:text-blue-400"
                >
                  {athlete.displayName}
                </Link>
                <p className="text-xs text-slate-500">
                  {top?.season.sport.label}
                  {top?.team?.name ? ` · ${top.team.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <OvrBadge rating={top?.rating} />
                <span className="text-xs text-slate-500">{views} views</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
