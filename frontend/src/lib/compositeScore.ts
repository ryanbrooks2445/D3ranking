/**
 * What the composite score consists of, per sport.
 * Shown on rankings pages so users understand how Score is calculated.
 */

const COMPOSITE_EXPLANATIONS: Record<string, string> = {
  mbb:
    "Composite score is a weighted combination of per-game stats, normalized (z-scores) across all players: " +
    "Points (2.0×), Rebounds (0.7×), Assists (0.7×), Steals (0.5×), Blocks (0.5×), minus Turnovers (0.8×). " +
    "Players need at least 10 games and 10 minutes per game. Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).",
  wbb:
    "Composite score is a weighted combination of per-game stats, normalized (z-scores) across all players: " +
    "Points (2.0×), Rebounds (0.7×), Assists (0.7×), Steals (0.5×), Blocks (0.5×), minus Turnovers (0.8×). " +
    "Players need at least 10 games and 10 minutes per game. Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).",
  mvb:
    "Composite score uses per-set volleyball stats (kills, digs, blocks, aces, hitting %), " +
    "normalized (z-scores) across all players. Players need at least 5 games played. Higher score = better overall contribution. OVR is derived from rank.",
  wvb:
    "Composite score uses per-set volleyball stats (kills, digs, blocks, aces, hitting %), " +
    "normalized (z-scores) across all players. Players need at least 5 games played. Higher score = better overall contribution. OVR is derived from rank.",
  baseball:
    "Baseball uses tiered ranking by segment. Batting is tiered by AVG first " +
    "(.400+, .350-.399, .300-.349, .250-.299, below .250), then per-game tie-breakers: RBI/G, SLG, HR/G, runs/G, SB/G. " +
    "Pitching priority is strikeout rate (K/9), then WHIP, opponent AVG, then ERA (lower is better for WHIP/opp AVG/ERA). " +
    "Players need at least 5 games played. OVR is derived from rank.",
  softball:
    "Counting stats are per game, so more games does not raise the score. " +
    "Batting uses AVG, HR/G, RBI/G, runs/G, SB/G, OBP, and SLG. " +
    "Pitching uses ERA plus strikeouts, wins, and saves per appearance. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  mhky:
    "Counting stats are per game (goals, assists, points, saves). Rates such as faceoff %, save %, and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  whky:
    "Counting stats are per game (goals, assists, points, saves). Rates such as faceoff %, save %, and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  mlax:
    "Counting stats are per game (goals, assists, points, ground balls, caused turnovers, saves). Save % and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  wlax:
    "Counting stats are per game (goals, assists, points, ground balls, caused turnovers, saves). Save % and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  football:
    "Counting stats are per game (yards, touchdowns, tackles, sacks, kicks, returns) so more games does not raise the score. " +
    "Efficiency, field-goal percentage, and punt average are used as rates. Players need at least 5 games played. " +
    "Rankings are shown by segment (QB, skill, defense, special teams). OVR is derived from rank.",
  mgolf:
    "Rankings use Clippd Scoreboard NCAA Division III data. Eligible players need at least 5 stroke-play rounds. " +
    "Order is scoring average (per round), then Clippd average points. More events or wins do not raise the rank. " +
    "Score shows Clippd average points. OVR is derived from D3Rank rank.",
  wgolf:
    "Rankings use Clippd Scoreboard NCAA Division III data. Eligible players need at least 5 stroke-play rounds. " +
    "Order is scoring average (per round), then Clippd average points. More events or wins do not raise the rank. " +
    "Score shows Clippd average points. OVR is derived from D3Rank rank.",
  mten:
    "Wins and losses are scored per match, along with win percentage, so playing more matches does not raise the score. " +
    "Players need at least 5 matches. OVR is derived from rank.",
  wten:
    "Wins and losses are scored per match, along with win percentage, so playing more matches does not raise the score. " +
    "Players need at least 5 matches. OVR is derived from rank.",
  msoc:
    "Counting stats are per game (goals, assists, points, shots, saves, shutouts, wins). Save % and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
  wsoc:
    "Counting stats are per game (goals, assists, points, shots, saves, shutouts, wins). Save % and GAA are used as-is. " +
    "Players need at least 5 games played. OVR is derived from rank.",
};

const DEFAULT_EXPLANATION =
  "Composite score is a weighted combination of key stats for this sport, normalized (z-scores) so players can be compared. " +
  "Higher score = better overall contribution. OVR is derived from rank (e.g. top players = 99).";

export function getCompositeScoreExplanation(sportCode: string): string {
  const code = sportCode.toLowerCase();
  return COMPOSITE_EXPLANATIONS[code] ?? DEFAULT_EXPLANATION;
}
