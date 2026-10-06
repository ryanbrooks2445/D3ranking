import { assignRanks, mean, median, round } from "@/lib/ranking/math";
import type { ConferenceRatingInput, ConferenceRatingResult } from "@/lib/ranking/types";

export const CONFERENCE_RATING_VERSION = "conference-strength-v1";

/**
 * rating = AVG_WEIGHT × mean(team ratings) + TOP_WEIGHT × mean(top 3 team ratings)
 *
 * The average rewards depth; the top-3 term rewards having nationally relevant
 * programs. Both inputs are the persisted team ratings, so a conference rating
 * is fully reproducible from the team rankings table.
 */
export const CONFERENCE_RATING_PARAMS = {
  avgWeight: 0.6,
  topWeight: 0.4,
  topN: 3,
  minTeams: 2,
} as const;

export function rateConferences(inputs: ConferenceRatingInput[]): ConferenceRatingResult[] {
  const partial = inputs.map((conf) => {
    const ratings = conf.teams
      .map((t) => t.rating)
      .filter((r): r is number => r != null && Number.isFinite(r))
      .sort((a, b) => b - a);
    const avg = mean(ratings);
    const top3 = mean(ratings.slice(0, CONFERENCE_RATING_PARAMS.topN));
    const rating =
      avg != null && top3 != null && ratings.length >= CONFERENCE_RATING_PARAMS.minTeams
        ? round(CONFERENCE_RATING_PARAMS.avgWeight * avg + CONFERENCE_RATING_PARAMS.topWeight * top3, 1)
        : null;

    return {
      conferenceId: conf.conferenceId,
      teamCount: conf.teams.length,
      rankedTeamCount: conf.teams.filter((t) => t.eligible && t.nationalRank != null).length,
      avgTeamRating: avg == null ? null : round(avg, 1),
      medianTeamRating: ((m) => (m == null ? null : round(m, 1)))(median(ratings)),
      topTeamRating: ratings.length ? ratings[0] : null,
      top3AvgRating: top3 == null ? null : round(top3, 1),
      teamsInTop25: conf.teams.filter((t) => t.nationalRank != null && t.nationalRank <= 25).length,
      rating,
    };
  });

  const ranks = assignRanks(partial, (c) => c.rating);
  return partial.map((c, i) => ({ ...c, nationalRank: ranks[i] }));
}
