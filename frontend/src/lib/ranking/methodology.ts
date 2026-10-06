import { CONFERENCE_RATING_PARAMS } from "@/lib/ranking/conferenceRating";
import { TEAM_RATING_PARAMS } from "@/lib/ranking/teamRating";

/** Plain-language descriptions shown next to rankings so the numbers are explainable. */
export const TEAM_RATING_METHODOLOGY = [
  `D3Rank team rating measures roster strength. It sums the composite scores of a team's top ${TEAM_RATING_PARAMS.coreSize} ranked players, adds half credit for the next ${TEAM_RATING_PARAMS.depthSize}, and scales the result across every Division III team so the national average is 50 and one standard deviation is 10.`,
  `Teams need at least ${TEAM_RATING_PARAMS.minRankedPlayers} ranked players and ${TEAM_RATING_PARAMS.minGamesPlayed} games played to receive a national rank. The rating does not use game results; records, scoring defense, and strength of schedule will be added when a results source is available.`,
];

export const CONFERENCE_RATING_METHODOLOGY = [
  `Conference rating is ${Math.round(CONFERENCE_RATING_PARAMS.avgWeight * 100)}% the average team rating in the league and ${Math.round(CONFERENCE_RATING_PARAMS.topWeight * 100)}% the average of its top ${CONFERENCE_RATING_PARAMS.topN} teams. The first term rewards depth, the second rewards nationally relevant programs.`,
  `Every input is a published team rating, so any conference's number can be reproduced from the team rankings table.`,
];

export const TEAM_STATS_METHODOLOGY =
  "Team statistics are aggregated from individual player season totals on official conference sites. Team turnovers and opponent statistics are not included.";
