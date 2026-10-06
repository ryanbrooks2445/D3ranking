import type { TeamSeasonStat } from "@prisma/client";
import { formatStat, formatRank } from "@/lib/format";
import { TEAM_STAT_COLUMNS } from "@/lib/statCategories";

/**
 * Team season statistics with each stat's national rank. Stats with no value for
 * this team are listed with a dash rather than omitted so coverage gaps are visible.
 */
export function TeamStatsTable({
  stat,
  ranks,
}: {
  stat: TeamSeasonStat | null;
  ranks: Map<string, { rank: number | null; of: number }> | undefined;
}) {
  const rows = TEAM_STAT_COLUMNS.map((col) => {
    const value = stat ? ((stat as unknown as Record<string, unknown>)[col.key] as number | null) : null;
    const r = ranks?.get(col.key);
    return { ...col, display: formatStat(value, col.kind), rank: r?.rank ?? null, of: r?.of ?? null, missing: value == null };
  });

  const available = rows.filter((r) => !r.missing);
  if (available.length === 0) {
    return (
      <p className="border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
        Team statistics are not available for this team. Its conference does not publish the per-player totals this
        page is built from.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-800">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Statistic</th>
            <th scope="col" className="num">Value</th>
            <th scope="col" className="num">Natl rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <span className="text-slate-200">{r.label}</span>
                <span className="ml-2 text-xs text-slate-500">{r.abbr}</span>
              </td>
              <td className={`num font-semibold ${r.missing ? "text-slate-600" : "text-white"}`}>{r.display}</td>
              <td className={`num ${r.rank == null ? "text-slate-600" : "text-slate-300"}`}>
                {r.rank == null ? "—" : (
                  <>
                    {formatRank(r.rank)}
                    <span className="ml-1 text-xs text-slate-500">/ {r.of}</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
