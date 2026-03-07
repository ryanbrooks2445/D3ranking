/**
 * What the composite score consists of, per sport.
 * Shown on rankings pages so users understand how Score is calculated.
 */

const COMPOSITE_EXPLANATIONS: Record<string, string> = {
  mbb:
    "Composite score is a weighted combination of per-game stats, normalized (z-scores) across all players: " +
    "Points (2.0×), Rebounds (0.7×), Assists (0.7×), Steals (0.5×), Blocks (0.5×), minus Turnovers (0.8×). " +
    "Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).",
  wbb:
    "Composite score is a weighted combination of per-game stats, normalized (z-scores) across all players: " +
    "Points (2.0×), Rebounds (0.7×), Assists (0.7×), Steals (0.5×), Blocks (0.5×), minus Turnovers (0.8×). " +
    "Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).",
  mvb:
    "Composite score is a weighted combination of key volleyball stats (e.g. kills, digs, blocks, aces, hitting %) " +
    "normalized (z-scores) across all players. Higher score = better overall contribution. OVR is derived from rank.",
  wvb:
    "Composite score is a weighted combination of key volleyball stats (e.g. kills, digs, blocks, aces, hitting %) " +
    "normalized (z-scores) across all players. Higher score = better overall contribution. OVR is derived from rank.",
  baseball:
    "Composite score is a weighted combination of key stats for the segment (batting or pitching), " +
    "normalized (z-scores) across all players. Batting: e.g. AVG, HR, RBI, runs, SB, OBP, SLG. " +
    "Pitching: e.g. IP, ERA, strikeouts, wins, saves. Higher score = better overall contribution. OVR is derived from rank.",
  softball:
    "Composite score is a weighted combination of key stats for the segment (batting or pitching), " +
    "normalized (z-scores) across all players. Batting: e.g. AVG, HR, RBI, runs, SB, OBP, SLG. " +
    "Pitching: e.g. IP, ERA, strikeouts, wins, saves. Higher score = better overall contribution. OVR is derived from rank.",
  mhky:
    "Composite score is a weighted combination of key stats for the segment (skaters or goalies), " +
    "normalized (z-scores) across all players. Skaters: e.g. goals, assists, points, faceoff %. " +
    "Goalies: e.g. save %, GAA, saves, shutouts. Higher score = better overall contribution. OVR is derived from rank.",
  whky:
    "Composite score is a weighted combination of key stats for the segment (skaters or goalies), " +
    "normalized (z-scores) across all players. Skaters: e.g. goals, assists, points, faceoff %. " +
    "Goalies: e.g. save %, GAA, saves, shutouts. Higher score = better overall contribution. OVR is derived from rank.",
  mlax:
    "Composite score is a weighted combination of key stats for the segment (field or goalies), " +
    "normalized (z-scores) across all players. Field: e.g. goals, assists, points, ground balls, caused turnovers. " +
    "Goalies: e.g. save %, GAA, saves, shutouts. Higher score = better overall contribution. OVR is derived from rank.",
  wlax:
    "Composite score is a weighted combination of key stats for the segment (field or goalies), " +
    "normalized (z-scores) across all players. Field: e.g. goals, assists, points, ground balls, caused turnovers. " +
    "Goalies: e.g. save %, GAA, saves, shutouts. Higher score = better overall contribution. OVR is derived from rank.",
  msoc:
    "Composite score is a weighted combination of key stats for the segment (field players or goalkeepers), " +
    "normalized (z-scores) across all players. Field: e.g. goals, assists, points, shots, SOG. " +
    "Goalies: e.g. save %, GAA, saves, shutouts, wins. Higher score = better overall contribution. OVR is derived from rank.",
  wsoc:
    "Composite score is a weighted combination of key stats for the segment (field players or goalkeepers), " +
    "normalized (z-scores) across all players. Field: e.g. goals, assists, points, shots, SOG. " +
    "Goalies: e.g. save %, GAA, saves, shutouts, wins. Higher score = better overall contribution. OVR is derived from rank.",
};

const DEFAULT_EXPLANATION =
  "Composite score is a weighted combination of key stats for this sport, normalized (z-scores) so players can be compared. " +
  "Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).";

export function getCompositeScoreExplanation(sportCode: string): string {
  const code = sportCode.toLowerCase();
  return COMPOSITE_EXPLANATIONS[code] ?? DEFAULT_EXPLANATION;
}
