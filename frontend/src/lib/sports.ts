/** Sport code → label and table column config for rankings. */
export type SportDef = {
  code: string;
  label: string;
  /** Columns to show in rankings table. key = field name, value = { label, pct? } */
  columns: { key: string; label: string; pct?: boolean }[];
};

const SPORTS: SportDef[] = [
  {
    code: "mbb",
    label: "Men's Basketball",
    columns: [
      { key: "rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "conference", label: "Conference" },
      { key: "rating", label: "OVR" },
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
      { key: "rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
      { key: "points_per_game", label: "PPG" },
      { key: "rebounds_per_game", label: "RPG" },
      { key: "assists_per_game", label: "APG" },
      { key: "turnovers_per_game", label: "TO" },
      { key: "steals_per_game", label: "SPG" },
      { key: "blocked_shots_per_game", label: "BPG" },
    ],
  },
  {
    code: "mvb",
    label: "Men's Volleyball",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
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
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
      { key: "per_set_stats_kills", label: "K/S" },
      { key: "per_set_stats_digs", label: "D/S" },
      { key: "per_set_stats_blocks", label: "B/S" },
      { key: "per_set_stats_aces", label: "A/S" },
      { key: "attack_stats_hitting_pct", label: "Hit%", pct: true },
    ],
  },
  {
    code: "baseball",
    label: "Baseball",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "softball",
    label: "Softball",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "mhky",
    label: "Men's Hockey",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "whky",
    label: "Women's Hockey",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "mlax",
    label: "Men's Lacrosse",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "wlax",
    label: "Women's Lacrosse",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "msoc",
    label: "Men's Soccer",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
  {
    code: "wsoc",
    label: "Women's Soccer",
    columns: [
      { key: "global_rank", label: "Rank" },
      { key: "player_name", label: "Player" },
      { key: "team", label: "Team" },
      { key: "rating", label: "OVR" },
    ],
  },
];

export function getSport(code: string): SportDef | undefined {
  const c = code.toLowerCase();
  return SPORTS.find((s) => s.code === c);
}

export function getAllSports(): SportDef[] {
  return SPORTS;
}
