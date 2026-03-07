/** Sport code → label and table column config for rankings. */
export type SportDef = {
  code: string;
  label: string;
  /** Columns to show in rankings table. key = field name, value = { label, pct? } */
  columns: { key: string; label: string; pct?: boolean }[];
  /** Optional segment (e.g. Batting/Pitching, or position) for this sport. */
  segments?: { id: string; label: string; columns: { key: string; label: string; pct?: boolean }[] }[];
};

/** Only composite score and overall (OVR) — no extra stat columns. */
const RANK_LABEL = "Rank";
const MINIMAL_COLUMNS: { key: string; label: string; pct?: boolean }[] = [
  { key: "global_rank", label: RANK_LABEL },
  { key: "player_name", label: "Player" },
  { key: "team", label: "Team" },
  { key: "composite_score", label: "Score" },
  { key: "rating", label: "OVR" },
];

function segmentColumns(rankLabel: string): { key: string; label: string; pct?: boolean }[] {
  return [
    { key: "global_rank", label: rankLabel },
    { key: "player_name", label: "Player" },
    { key: "team", label: "Team" },
    { key: "composite_score", label: "Score" },
    { key: "rating", label: "OVR" },
  ];
}

const SPORTS: SportDef[] = [
  {
    code: "mbb",
    label: "Men's Basketball",
    columns: [
      { key: "rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "composite_score", label: "Score" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "wbb",
    label: "Women's Basketball",
    columns: [
      { key: "rank", label: RANK_LABEL },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "composite_score", label: "Score" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "mvb",
    label: "Men's Volleyball",
    columns: [...MINIMAL_COLUMNS],
  },
  {
    code: "wvb",
    label: "Women's Volleyball",
    columns: [...MINIMAL_COLUMNS],
  },
  {
    code: "baseball",
    label: "Baseball",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "batting", label: "Batting", columns: segmentColumns("Rank (Batting)") },
      { id: "pitching", label: "Pitching", columns: segmentColumns("Rank (Pitching)") },
    ],
  },
  {
    code: "softball",
    label: "Softball",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "batting", label: "Batting", columns: segmentColumns("Rank (Batting)") },
      { id: "pitching", label: "Pitching", columns: segmentColumns("Rank (Pitching)") },
    ],
  },
  {
    code: "mhky",
    label: "Men's Hockey",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "skaters", label: "Skaters", columns: segmentColumns("Rank (Skaters)") },
      { id: "goalies", label: "Goalies", columns: segmentColumns("Rank (Goalies)") },
    ],
  },
  {
    code: "whky",
    label: "Women's Hockey",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "skaters", label: "Skaters", columns: segmentColumns("Rank (Skaters)") },
      { id: "goalies", label: "Goalies", columns: segmentColumns("Rank (Goalies)") },
    ],
  },
  {
    code: "mlax",
    label: "Men's Lacrosse",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "field", label: "Field", columns: segmentColumns("Rank (Field)") },
      { id: "goalies", label: "Goalies", columns: segmentColumns("Rank (Goalies)") },
    ],
  },
  {
    code: "wlax",
    label: "Women's Lacrosse",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "field", label: "Field", columns: segmentColumns("Rank (Field)") },
      { id: "goalies", label: "Goalies", columns: segmentColumns("Rank (Goalies)") },
    ],
  },
  {
    code: "msoc",
    label: "Men's Soccer",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "field", label: "Field players", columns: segmentColumns("Rank (Field players)") },
      { id: "goalies", label: "Goalkeepers", columns: segmentColumns("Rank (Goalkeepers)") },
    ],
  },
  {
    code: "wsoc",
    label: "Women's Soccer",
    columns: [...MINIMAL_COLUMNS],
    segments: [
      { id: "field", label: "Field players", columns: segmentColumns("Rank (Field players)") },
      { id: "goalies", label: "Goalkeepers", columns: segmentColumns("Rank (Goalkeepers)") },
    ],
  },
];

export function getSport(code: string): SportDef | undefined {
  const c = code.toLowerCase();
  return SPORTS.find((s) => s.code === c);
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

  if (code === "baseball" || code === "softball") {
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
    if (segmentId === "goalies") {
      return rows.filter(
        (r) =>
          r.goalie_stats_games_played != null ||
          r.goalie_stats_save_pct != null ||
          r.goalie_stats_goals_against_avg != null
      );
    }
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
