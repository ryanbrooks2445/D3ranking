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
    "Baseball uses tiered ranking by segment. Batting is tiered by AVG first " +
    "(.400+, .350-.399, .300-.349, .250-.299, below .250), then tie-breakers in order: RBI, SLG, HR, runs, SB. " +
    "Pitching priority is strikeout rate (K/9), then WHIP, opponent AVG, then ERA (lower is better for WHIP/opp AVG/ERA). " +
    "Only players with meaningful playing time are ranked. OVR is derived from rank.",
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
  football:
    "Football rankings are shown by segment so players are compared against similar roles instead of one all-position leaderboard. " +
    "QB emphasizes passing and efficiency, Skill blends rushing/receiving production, Defense leans on tackles, sacks, interceptions, and disruptions, " +
    "and Special Teams highlights kicking, punting, and return value. Composite score is normalized within the football dataset and OVR is derived from rank.",
  mgolf:
    "Composite score is a weighted combination of golf scoring metrics, normalized (z-scores) across all players: " +
    "scoring average, vs par, rounds/strokes, and top finishes. Lower scoring averages are weighted positively via inverse weighting. " +
    "Higher score = better season performance. OVR is derived from rank.",
  wgolf:
    "Composite score is a weighted combination of golf scoring metrics, normalized (z-scores) across all players: " +
    "scoring average, vs par, rounds/strokes, and top finishes. Lower scoring averages are weighted positively via inverse weighting. " +
    "Higher score = better season performance. OVR is derived from rank.",
  mten:
    "Composite score is a weighted combination of tennis results, normalized (z-scores) across all players: " +
    "singles wins, doubles wins, total wins, and win percentage, with losses negatively weighted. " +
    "Higher score = stronger season performance. OVR is derived from rank.",
  wten:
    "Composite score is a weighted combination of tennis results, normalized (z-scores) across all players: " +
    "singles wins, doubles wins, total wins, and win percentage, with losses negatively weighted. " +
    "Higher score = stronger season performance. OVR is derived from rank.",
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
