import { assignRanks, round, toTScores } from "@/lib/ranking/math";
import type { TeamRatingInput, TeamRatingResult } from "@/lib/ranking/types";

export const TEAM_RATING_VERSION = "team-roster-strength-v1";

/**
 * Roster-strength model. The pipeline has no game results, so the rating
 * measures how much ranked production a roster carries, not wins.
 *
 *   rawStrength = Σ composite(top 5 players) + DEPTH_WEIGHT × Σ composite(players 6–8)
 *   rating      = T-score of rawStrength across all teams in the sport/season (mean 50, SD 10)
 *
 * Composite scores come from the existing per-player z-score engine, so they are
 * already normalized across Division III for the season.
 */
export const TEAM_RATING_PARAMS = {
  coreSize: 5,
  depthSize: 3,
  depthWeight: 0.5,
  minRankedPlayers: 3,
  minGamesPlayed: 10,
} as const;

export function computeRawStrength(compositeScores: number[]): number {
  const sorted = [...compositeScores].sort((a, b) => b - a);
  const core = sorted.slice(0, TEAM_RATING_PARAMS.coreSize);
  const depth = sorted.slice(
    TEAM_RATING_PARAMS.coreSize,
    TEAM_RATING_PARAMS.coreSize + TEAM_RATING_PARAMS.depthSize,
  );
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return sum(core) + TEAM_RATING_PARAMS.depthWeight * sum(depth);
}

export function isTeamEligible(rankedPlayerCount: number, gamesPlayed: number | null): boolean {
  return (
    rankedPlayerCount >= TEAM_RATING_PARAMS.minRankedPlayers &&
    gamesPlayed != null &&
    gamesPlayed >= TEAM_RATING_PARAMS.minGamesPlayed
  );
}

export function rateTeams(inputs: TeamRatingInput[]): TeamRatingResult[] {
  const partial = inputs.map((team) => {
    const composites = team.players
      .map((p) => p.compositeScore)
      .filter((c): c is number => c != null && Number.isFinite(c));
    const rankedPlayerCount = composites.length;
    return {
      teamId: team.teamId,
      conferenceId: team.conferenceId,
      rawStrength: computeRawStrength(composites),
      rankedPlayerCount,
      eligible: isTeamEligible(rankedPlayerCount, team.gamesPlayed),
    };
  });

  const tScores = toTScores(partial.map((t) => t.rawStrength));
  const withRating = partial.map((t, i) => ({
    ...t,
    rating: round(tScores[i], 1),
  }));

  const nationalRanks = assignRanks(withRating, (t) => (t.eligible ? t.rating : null));

  const conferenceRanks: (number | null)[] = withRating.map(() => null);
  const byConference = new Map<string, number[]>();
  withRating.forEach((t, i) => {
    if (!t.conferenceId) return;
    const list = byConference.get(t.conferenceId) ?? [];
    list.push(i);
    byConference.set(t.conferenceId, list);
  });
  for (const indices of byConference.values()) {
    const ranks = assignRanks(indices, (i) => withRating[i].rating);
    indices.forEach((teamIdx, j) => {
      conferenceRanks[teamIdx] = ranks[j];
    });
  }

  return withRating.map((t, i) => ({
    ...t,
    nationalRank: nationalRanks[i],
    conferenceRank: conferenceRanks[i],
  }));
}
