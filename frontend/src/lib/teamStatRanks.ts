import type { TeamSeasonStat } from "@prisma/client";
import { assignRanks } from "@/lib/ranking/math";
import { TEAM_STAT_COLUMNS } from "@/lib/statCategories";

const LOWER_IS_BETTER = new Set<string>(["turnoversPerGame"]);

export type TeamStatRankMap = Map<string, Map<string, { rank: number | null; of: number }>>;

/**
 * For every supported team stat, rank each team against all teams that have a
 * value for that stat. Returns teamId → statKey → { rank, of }.
 */
export function computeTeamStatRanks(stats: { teamId: string; stat: TeamSeasonStat | null }[]): TeamStatRankMap {
  const out: TeamStatRankMap = new Map();
  for (const col of TEAM_STAT_COLUMNS) {
    const withValue = stats.filter((s) => s.stat && (s.stat as Record<string, unknown>)[col.key] != null);
    const sign = LOWER_IS_BETTER.has(col.key) ? -1 : 1;
    const ranks = assignRanks(withValue, (s) => sign * Number((s.stat as Record<string, unknown>)[col.key]));
    withValue.forEach((s, i) => {
      const byStat = out.get(s.teamId) ?? new Map();
      byStat.set(col.key, { rank: ranks[i], of: withValue.length });
      out.set(s.teamId, byStat);
    });
  }
  return out;
}
