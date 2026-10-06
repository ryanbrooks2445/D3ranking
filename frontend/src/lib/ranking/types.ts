export type RosterPlayerInput = {
  compositeScore: number | null;
  gamesPlayed: number | null;
};

export type TeamRatingInput = {
  teamId: string;
  conferenceId: string | null;
  gamesPlayed: number | null;
  players: RosterPlayerInput[];
};

export type TeamRatingResult = {
  teamId: string;
  conferenceId: string | null;
  rawStrength: number;
  rankedPlayerCount: number;
  eligible: boolean;
  rating: number | null;
  nationalRank: number | null;
  conferenceRank: number | null;
};

export type ConferenceRatingInput = {
  conferenceId: string;
  teams: Pick<TeamRatingResult, "rating" | "nationalRank" | "eligible">[];
};

export type ConferenceRatingResult = {
  conferenceId: string;
  teamCount: number;
  rankedTeamCount: number;
  avgTeamRating: number | null;
  medianTeamRating: number | null;
  topTeamRating: number | null;
  top3AvgRating: number | null;
  teamsInTop25: number;
  rating: number | null;
  nationalRank: number | null;
};

export type SnapshotEntry = { id: string; rank: number; rating: number };
