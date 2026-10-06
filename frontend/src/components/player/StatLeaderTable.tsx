import Link from "next/link";
import type { StatLeader } from "@/lib/players";
import type { StatCategory } from "@/lib/statCategories";
import { formatStat } from "@/lib/format";

/** Compact leaderboard for one statistical category. */
export function StatLeaderTable({
  category,
  leaders,
  sportCode,
  showTeam = true,
  href,
}: {
  category: StatCategory;
  leaders: StatLeader[];
  sportCode: string;
  showTeam?: boolean;
  href?: string;
}) {
  return (
    <section aria-label={`${category.label} leaders`} className="min-w-0">
      <div className="flex items-baseline justify-between border-b border-slate-700 pb-1.5">
        <h3 className="text-sm font-bold text-white">
          {category.label}
          <span className="ml-2 text-xs font-normal text-slate-500">{category.abbr}</span>
        </h3>
        {href && (
          <Link href={href} className="text-xs text-blue-400 hover:text-blue-300">
            All
          </Link>
        )}
      </div>
      {leaders.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">No qualifying players.</p>
      ) : (
        <ol className="divide-y divide-slate-800/80">
          {leaders.map(({ row, value }, i) => (
            <li key={row.id} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="num w-5 shrink-0 text-xs text-slate-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                <Link href={`/athletes/${row.athlete.slug}`} className="font-medium text-slate-100 hover:text-blue-300">
                  {row.athlete.displayName}
                </Link>
                {showTeam && row.team && (
                  <>
                    <span className="text-slate-600"> · </span>
                    <Link href={`/teams/${sportCode}/${row.team.slug}`} className="text-slate-400 hover:text-white">
                      {row.team.name}
                    </Link>
                  </>
                )}
              </span>
              <span className="num shrink-0 font-semibold text-white">{formatStat(value, category.kind)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
