/** Sport code → label and table column config for rankings. */
export type SportDef = {
  code: string;
  label: string;
  /** Columns to show in rankings table. key = field name, value = { label, pct? } */
  columns: { key: string; label: string; pct?: boolean }[];
  /** Optional segment (e.g. Batting/Pitching, or position) for this sport. */
  segments?: { id: string; label: string; columns: { key: string; label: string; pct?: boolean }[] }[];
};

const RANK_LABEL = "Rank";

const SPORTS: SportDef[] = [
  {
    code: "mbb",
    label: "Men's Basketball",
    columns: [
      { key: "rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "points_per_game", label: "PPG" },
      { key: "rebounds_per_game", label: "RPG" },
      { key: "assists_per_game", label: "APG" },
      { key: "turnovers_per_game", label: "TO" },
      { key: "steals_per_game", label: "SPG" },
      { key: "blocked_shots_per_game", label: "BPG" },
    ],
  },
  {
    code: "wbb",
    label: "Women's Basketball",
    columns: [
      { key: "rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "points_per_game", label: "PPG" },
      { key: "rebounds_per_game", label: "RPG" },
      { key: "assists_per_game", label: "APG" },
      { key: "turnovers_per_game", label: "TO" },
      { key: "steals_per_game", label: "SPG" },
      { key: "blocked_shots_per_game", label: "BPG" },
    ],
  },
  {
    code: "baseball",
    label: "Baseball",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "hitting_stats_batting_average", label: "AVG" },
      { key: "hitting_stats_home_runs", label: "HR" },
      { key: "hitting_stats_runs_batted_in", label: "RBI" },
      { key: "hitting_stats_runs", label: "R" },
      { key: "hitting_stats_stolen_bases", label: "SB" },
      { key: "hitting_stats_onbase_percentage", label: "OBP" },
      { key: "hitting_stats_slugging_percentage", label: "SLG" },
    ],
    segments: [
      {
        id: "batting",
        label: "Batting",
        columns: [
          { key: "global_rank", label: "Rank (Batting)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "hitting_stats_batting_average", label: "AVG" },
          { key: "hitting_stats_onbase_percentage", label: "OBP" },
          { key: "hitting_stats_slugging_percentage", label: "SLG" },
          { key: "hitting_stats_home_runs", label: "HR" },
          { key: "hitting_stats_runs_batted_in", label: "RBI" },
        ],
      },
      {
        id: "pitching",
        label: "Pitching",
        columns: [
          { key: "global_rank", label: "Rank (Pitching)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "pitching_stats_k_per_9", label: "K/9" },
          { key: "pitching_stats_whip", label: "WHIP" },
          { key: "pitching_stats_opponent_batting_average", label: "Opp AVG" },
          { key: "pitching_stats_earned_run_avg", label: "ERA" },
        ],
      },
    ],
  },
  {
    code: "mvb",
    label: "Men's Volleyball",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "per_set_stats_kills", label: "K/S" },
      { key: "per_set_stats_digs", label: "D/S" },
      { key: "per_set_stats_blocks", label: "B/S" },
      { key: "per_set_stats_aces", label: "A/S" },
      { key: "attack_stats_hitting_pct", label: "Hit%", pct: true },
    ],
  },
  {
    code: "wvb",
    label: "Women's Volleyball",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "per_set_stats_kills", label: "K/S" },
      { key: "per_set_stats_digs", label: "D/S" },
      { key: "per_set_stats_blocks", label: "B/S" },
      { key: "per_set_stats_aces", label: "A/S" },
      { key: "attack_stats_hitting_pct", label: "Hit%", pct: true },
    ],
  },
  {
    code: "softball",
    label: "Softball",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "hitting_stats_batting_average", label: "AVG", pct: true },
      { key: "hitting_stats_home_runs", label: "HR" },
      { key: "hitting_stats_runs_batted_in", label: "RBI" },
      { key: "hitting_stats_runs", label: "R" },
      { key: "hitting_stats_stolen_bases", label: "SB" },
      { key: "hitting_stats_onbase_percentage", label: "OBP", pct: true },
      { key: "hitting_stats_slugging_percentage", label: "SLG", pct: true },
    ],
    segments: [
      {
        id: "batting",
        label: "Batting",
        columns: [
          { key: "global_rank", label: "Rank (Batting)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "hitting_stats_batting_average", label: "AVG", pct: true },
          { key: "hitting_stats_home_runs", label: "HR" },
          { key: "hitting_stats_runs_batted_in", label: "RBI" },
          { key: "hitting_stats_runs", label: "R" },
          { key: "hitting_stats_stolen_bases", label: "SB" },
          { key: "hitting_stats_onbase_percentage", label: "OBP", pct: true },
          { key: "hitting_stats_slugging_percentage", label: "SLG", pct: true },
        ],
      },
      {
        id: "pitching",
        label: "Pitching",
        columns: [
          { key: "global_rank", label: "Rank (Pitching)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "pitching_stats_innings_pitched", label: "IP" },
          { key: "pitching_stats_earned_run_avg", label: "ERA" },
          { key: "pitching_stats_strikeouts", label: "K" },
          { key: "pitching_stats_wins", label: "W" },
          { key: "pitching_stats_losses", label: "L" },
          { key: "pitching_stats_saves", label: "SV" },
        ],
      },
    ],
  },
  {
    code: "mhky",
    label: "Men's Hockey",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
    ],
  },
  {
    code: "whky",
    label: "Women's Hockey",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
    ],
  },
  {
    code: "mlax",
    label: "Men's Lacrosse",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "shot_stats_goals", label: "G" },
      { key: "shot_stats_assists", label: "A" },
      { key: "shot_stats_points", label: "Pts" },
      { key: "misc_stats_ground_balls", label: "GB" },
      { key: "misc_stats_caused_turnovers", label: "CT" },
    ],
    segments: [
      {
        id: "field",
        label: "Field",
        columns: [
          { key: "global_rank", label: "Rank (Field)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "shot_stats_goals", label: "G" },
          { key: "shot_stats_assists", label: "A" },
          { key: "shot_stats_points", label: "Pts" },
          { key: "misc_stats_ground_balls", label: "GB" },
          { key: "misc_stats_caused_turnovers", label: "CT" },
        ],
      },
      {
        id: "goalies",
        label: "Goalies",
        columns: [
          { key: "global_rank", label: "Rank (Goalies)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "goalie_stats_save_pct", label: "SV%", pct: true },
          { key: "goalie_stats_goals_against_avg", label: "GAA" },
          { key: "goalie_stats_saves", label: "Saves" },
          { key: "goalie_stats_shutouts", label: "SHO" },
        ],
      },
    ],
  },
  {
    code: "wlax",
    label: "Women's Lacrosse",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "shot_stats_goals", label: "G" },
      { key: "shot_stats_assists", label: "A" },
      { key: "shot_stats_points", label: "Pts" },
      { key: "misc_stats_ground_balls", label: "GB" },
      { key: "misc_stats_caused_turnovers", label: "CT" },
    ],
    segments: [
      {
        id: "field",
        label: "Field",
        columns: [
          { key: "global_rank", label: "Rank (Field)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "shot_stats_goals", label: "G" },
          { key: "shot_stats_assists", label: "A" },
          { key: "shot_stats_points", label: "Pts" },
          { key: "misc_stats_ground_balls", label: "GB" },
          { key: "misc_stats_caused_turnovers", label: "CT" },
        ],
      },
      {
        id: "goalies",
        label: "Goalies",
        columns: [
          { key: "global_rank", label: "Rank (Goalies)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "goalie_stats_save_pct", label: "SV%", pct: true },
          { key: "goalie_stats_goals_against_avg", label: "GAA" },
          { key: "goalie_stats_saves", label: "Saves" },
          { key: "goalie_stats_shutouts", label: "SHO" },
        ],
      },
    ],
  },
  {
    code: "football",
    label: "Football",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "passing_stats_passing_yards", label: "Pass Yds" },
      { key: "rushing_stats_rushing_yards", label: "Rush Yds" },
      { key: "receiving_stats_receiving_yards", label: "Rec Yds" },
      { key: "defensive_stats_tackles", label: "Tackles" },
      { key: "defensive_stats_interceptions", label: "INT" },
    ],
  },
  {
    code: "mgolf",
    label: "Men's Golf",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "scoring_stats_scoring_average", label: "Scoring Avg" },
      { key: "scoring_stats_vs_par", label: "Vs Par" },
      { key: "scoring_stats_rounds", label: "Rounds" },
      { key: "top10_finishes", label: "Top 10" },
    ],
  },
  {
    code: "wgolf",
    label: "Women's Golf",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "scoring_stats_scoring_average", label: "Scoring Avg" },
      { key: "scoring_stats_vs_par", label: "Vs Par" },
      { key: "scoring_stats_rounds", label: "Rounds" },
      { key: "top10_finishes", label: "Top 10" },
    ],
  },
  {
    code: "mten",
    label: "Men's Tennis",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "overall_stats_singles_wins", label: "Singles W" },
      { key: "overall_stats_singles_losses", label: "Singles L" },
      { key: "overall_stats_doubles_wins", label: "Doubles W" },
      { key: "overall_stats_doubles_losses", label: "Doubles L" },
      { key: "overall_stats_win_pct", label: "Win%", pct: true },
    ],
  },
  {
    code: "wten",
    label: "Women's Tennis",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "overall_stats_singles_wins", label: "Singles W" },
      { key: "overall_stats_singles_losses", label: "Singles L" },
      { key: "overall_stats_doubles_wins", label: "Doubles W" },
      { key: "overall_stats_doubles_losses", label: "Doubles L" },
      { key: "overall_stats_win_pct", label: "Win%", pct: true },
    ],
  },
  {
    code: "msoc",
    label: "Men's Soccer",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "shot_stats_goals", label: "G" },
      { key: "shot_stats_assists", label: "A" },
      { key: "shot_stats_points", label: "Pts" },
      { key: "shot_stats_shots", label: "Shots" },
      { key: "shot_stats_shots_on_goal", label: "SOG" },
    ],
    segments: [
      {
        id: "field",
        label: "Field players",
        columns: [
          { key: "global_rank", label: "Rank (Field players)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "shot_stats_goals", label: "G" },
          { key: "shot_stats_assists", label: "A" },
          { key: "shot_stats_points", label: "Pts" },
          { key: "shot_stats_shots", label: "Shots" },
          { key: "shot_stats_shots_on_goal", label: "SOG" },
        ],
      },
      {
        id: "goalies",
        label: "Goalkeepers",
        columns: [
          { key: "global_rank", label: "Rank (Goalkeepers)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "goalie_stats_save_percentage", label: "SV%", pct: true },
          { key: "goalie_stats_goals_against_avg", label: "GAA" },
          { key: "goalie_stats_saves", label: "Saves" },
          { key: "goalie_stats_shutouts", label: "SHO" },
          { key: "goalie_stats_wins", label: "W" },
        ],
      },
    ],
  },
  {
    code: "wsoc",
    label: "Women's Soccer",
    columns: [
      { key: "global_rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "position", label: "Pos" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
      { key: "composite_score", label: "Score" },
      { key: "shot_stats_goals", label: "G" },
      { key: "shot_stats_assists", label: "A" },
      { key: "shot_stats_points", label: "Pts" },
      { key: "shot_stats_shots", label: "Shots" },
      { key: "shot_stats_shots_on_goal", label: "SOG" },
    ],
    segments: [
      {
        id: "field",
        label: "Field players",
        columns: [
          { key: "global_rank", label: "Rank (Field players)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "shot_stats_goals", label: "G" },
          { key: "shot_stats_assists", label: "A" },
          { key: "shot_stats_points", label: "Pts" },
          { key: "shot_stats_shots", label: "Shots" },
          { key: "shot_stats_shots_on_goal", label: "SOG" },
        ],
      },
      {
        id: "goalies",
        label: "Goalkeepers",
        columns: [
          { key: "global_rank", label: "Rank (Goalkeepers)" },
          { key: "player_name", label: "Player" },
          { key: "team", label: "Team" },
          { key: "conference", label: "Conference" },
          { key: "rating", label: "OVR" },
          { key: "composite_score", label: "Score" },
          { key: "goalie_stats_save_percentage", label: "SV%", pct: true },
          { key: "goalie_stats_goals_against_avg", label: "GAA" },
          { key: "goalie_stats_saves", label: "Saves" },
          { key: "goalie_stats_shutouts", label: "SHO" },
          { key: "goalie_stats_wins", label: "W" },
        ],
      },
    ],
  },
];

export function getSport(code: string): SportDef | undefined {
  const c = code.toLowerCase();
  return SPORTS.find((s) => s.code === c);
}

/** Sports that show "Under construction" instead of rankings (e.g. hockey). */
const UNDER_CONSTRUCTION_CODES = new Set(["mhky", "whky"]);

export function isSportUnderConstruction(code: string): boolean {
  return UNDER_CONSTRUCTION_CODES.has(code.toLowerCase());
}

export function getSportSegmentColumns(
  def: SportDef | undefined,
  segmentId: string
): { key: string; label: string; pct?: boolean }[] {
  if (!def) return [];
  if (segmentId && def.segments) {
    const seg = def.segments.find((s) => s.id === segmentId);
    if (seg) return seg.columns.map((c) => ({ ...c, key: c.key === "rank" ? "global_rank" : c.key }));
  }
  return (def.columns ?? []).map((c) => ({
    ...c,
    key: c.key === "rank" ? "global_rank" : c.key,
  }));
}

/** Filter rows by segment (e.g. Batting vs Pitching, or Goalies vs Field). */
export function filterRowsBySegment(
  sportCode: string,
  segmentId: string,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (!segmentId || segmentId === "all") return rows;
  const code = sportCode.toLowerCase();

  if (code === "baseball") {
    const hasRankingSegment = rows.some((r) => r.ranking_segment != null);
    if (segmentId === "batting") {
      if (hasRankingSegment) {
        return rows.filter((r) => String(r.ranking_segment ?? "").toLowerCase() === "batting");
      }
      return rows.filter((r) => {
        const ab = r.hitting_stats_at_bats;
        const gp = r.games_played;
        return ab != null && Number(ab) >= 15 && gp != null && Number(gp) >= 5;
      });
    }
    if (segmentId === "pitching") {
      if (hasRankingSegment) {
        return rows.filter((r) => String(r.ranking_segment ?? "").toLowerCase() === "pitching");
      }
      return rows.filter((r) => {
        const gs = r.pitching_stats_games_started;
        const ip = r.pitching_stats_innings_pitched;
        return (
          gs != null &&
          Number(gs) >= 1 &&
          ip != null &&
          Number(ip) >= 5
        );
      });
    }
  }
  if (code === "softball") {
    if (segmentId === "batting") {
      return rows.filter((r) => {
        const ab = r.hitting_stats_at_bats;
        return ab != null && Number(ab) > 0;
      });
    }
    if (segmentId === "pitching") {
      return rows.filter((r) => {
        return (
          r.pitching_stats_innings_pitched != null ||
          r.pitching_stats_earned_run_avg != null ||
          r.pitching_stats_strikeouts != null
        );
      });
    }
  }

  if (code === "msoc" || code === "wsoc") {
    if (segmentId === "goalies") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played != null ||
          r.goalie_stats_saves != null ||
          r.goalie_stats_goals_against_avg != null
      );
    }
    if (segmentId === "field") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played == null &&
          r.goalie_stats_saves == null &&
          r.goalie_stats_goals_against_avg == null
      );
    }
  }

  if (code === "mhky" || code === "whky") {
    if (segmentId === "skaters") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played == null &&
          r.goalie_stats_save_pct == null &&
          r.goalie_stats_goals_against_avg == null
      );
    }
  }

  if (code === "mlax" || code === "wlax") {
    if (segmentId === "goalies") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played != null ||
          r.goalie_stats_save_pct != null ||
          r.goalie_stats_goals_against_avg != null
      );
    }
    if (segmentId === "field") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played == null &&
          r.goalie_stats_save_pct == null &&
          r.goalie_stats_goals_against_avg == null
      );
    }
  }

  return rows;
}

export function getAllSports(): SportDef[] {
  return SPORTS;
}
