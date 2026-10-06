import type { StatKind } from "@/lib/format";
import { getSport } from "@/lib/sports";

export type StatCategory = {
  key: string;
  label: string;
  abbr: string;
  kind: StatKind;
  /** Lower is better (e.g. ERA, turnovers). */
  lowerIsBetter?: boolean;
};

const BASKETBALL_LEADER_CATEGORIES: StatCategory[] = [
  { key: "points_per_game", label: "Points per game", abbr: "PPG", kind: "perGame" },
  { key: "rebounds_per_game", label: "Rebounds per game", abbr: "RPG", kind: "perGame" },
  { key: "assists_per_game", label: "Assists per game", abbr: "APG", kind: "perGame" },
  { key: "steals_per_game", label: "Steals per game", abbr: "SPG", kind: "perGame" },
  { key: "blocked_shots_per_game", label: "Blocks per game", abbr: "BPG", kind: "perGame" },
];

const IDENTITY_KEYS = new Set([
  "rank", "global_rank", "player_name", "team", "position", "conference", "conference_code",
  "rating", "composite_score", "season", "gp", "mpg",
]);

const LOWER_IS_BETTER_KEYS = new Set([
  "turnovers_per_game",
  "pitching_stats_earned_run_avg",
  "pitching_stats_whip",
  "pitching_stats_opponent_batting_average",
  "goalie_stats_goals_against_avg",
  "scoring_stats_scoring_average",
  "scoring_stats_vs_par",
  "overall_stats_singles_losses",
  "overall_stats_doubles_losses",
  "pitching_stats_losses",
  "pitching_stats_losses_per_game",
  "pitching_stats_walks_allowed_per_game",
  "overall_stats_singles_losses_per_game",
  "overall_stats_doubles_losses_per_game",
  "pass_stats_interceptions_per_game",
  "fumble_stats_number_lost_per_game",
]);

/** Stat leader categories for a sport. Basketball is curated; others derive from table columns. */
export function getLeaderCategories(sportCode: string): StatCategory[] {
  const code = sportCode.toLowerCase();
  if (code === "mbb" || code === "wbb") return BASKETBALL_LEADER_CATEGORIES;
  const def = getSport(code);
  if (!def) return [];
  return def.columns
    .filter((c) => !IDENTITY_KEYS.has(c.key))
    .map((c) => ({
      key: c.key,
      label: c.label,
      abbr: c.label,
      kind: c.pct ? "pct" : /average|percentage/.test(c.key) ? "rate3" : /per_game|per_set|avg/.test(c.key) ? "perGame" : "int",
      lowerIsBetter: LOWER_IS_BETTER_KEYS.has(c.key),
    }));
}

/** Team stat columns the current dataset supports, in display order. */
export const TEAM_STAT_COLUMNS: { key: string; label: string; abbr: string; kind: StatKind }[] = [
  { key: "pointsPerGame", label: "Points per game", abbr: "PPG", kind: "perGame" },
  { key: "reboundsPerGame", label: "Rebounds per game", abbr: "RPG", kind: "perGame" },
  { key: "assistsPerGame", label: "Assists per game", abbr: "APG", kind: "perGame" },
  { key: "turnoversPerGame", label: "Turnovers per game", abbr: "TOPG", kind: "perGame" },
  { key: "stealsPerGame", label: "Steals per game", abbr: "SPG", kind: "perGame" },
  { key: "blocksPerGame", label: "Blocks per game", abbr: "BPG", kind: "perGame" },
  { key: "fieldGoalPct", label: "Field goal %", abbr: "FG%", kind: "pct" },
  { key: "threePointPct", label: "Three-point %", abbr: "3P%", kind: "pct" },
  { key: "freeThrowPct", label: "Free throw %", abbr: "FT%", kind: "pct" },
];
