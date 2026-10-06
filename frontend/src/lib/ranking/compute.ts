import { Prisma, RankingEntityType, type PrismaClient } from "@prisma/client";
import { CONFERENCE_RATING_VERSION, rateConferences } from "@/lib/ranking/conferenceRating";
import { TEAM_RATING_VERSION, rateTeams } from "@/lib/ranking/teamRating";
import type { SnapshotEntry, TeamRatingInput } from "@/lib/ranking/types";
import { slugifyTeam } from "@/lib/slugs";

/** Shape of one record in public/data/sports/{sport}/teams_{season}.json. */
export type TeamStatsRecord = {
  team: string;
  conference_code: string;
  season: string;
  games_played: number | null;
  roster_count: number;
  points_per_game: number | null;
  rebounds_per_game: number | null;
  assists_per_game: number | null;
  turnovers_per_game: number | null;
  steals_per_game: number | null;
  blocks_per_game: number | null;
  fg_pct: number | null;
  tp_pct: number | null;
  ft_pct: number | null;
};

export type ComputeSummary = {
  sportCode: string;
  seasonLabel: string;
  teamsRated: number;
  teamsRanked: number;
  teamsWithStats: number;
  conferencesRated: number;
};

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute and persist team + conference ratings for the current season of a sport.
 * Stats records are optional: teams without one still receive a rating from roster
 * composites, but their aggregate stat columns stay null.
 */
export async function computeAndPersistRankings(
  prisma: PrismaClient,
  sportCode: string,
  statsRecords: TeamStatsRecord[],
): Promise<ComputeSummary> {
  const season = await prisma.season.findFirst({
    where: { sport: { code: sportCode }, isCurrent: true },
    include: { sport: true },
  });
  if (!season) throw new Error(`No current season for sport ${sportCode}`);

  const teams = await prisma.team.findMany({
    where: { sportId: season.sportId, seasonId: season.id },
    select: {
      id: true,
      slug: true,
      conferenceId: true,
      athleteSeasons: {
        where: { seasonId: season.id },
        select: { compositeScore: true, eligibilityMeta: true },
      },
    },
  });

  const statsBySlug = new Map<string, TeamStatsRecord>();
  for (const rec of statsRecords) statsBySlug.set(slugifyTeam(rec.team), rec);

  const inputs: TeamRatingInput[] = teams.map((t) => {
    const stats = statsBySlug.get(t.slug);
    const rosterGp = t.athleteSeasons
      .map((a) => num((a.eligibilityMeta as Record<string, unknown> | null)?.gp))
      .filter((g): g is number => g != null);
    const gamesPlayed = stats?.games_played ?? (rosterGp.length ? Math.max(...rosterGp) : null);
    return {
      teamId: t.id,
      conferenceId: t.conferenceId,
      gamesPlayed,
      players: t.athleteSeasons.map((a) => ({
        compositeScore: a.compositeScore,
        gamesPlayed: num((a.eligibilityMeta as Record<string, unknown> | null)?.gp),
      })),
    };
  });

  const teamResults = rateTeams(inputs);
  const teamBySlug = new Map(teams.map((t) => [t.id, t.slug]));

  const existing = await prisma.teamSeasonStat.findMany({
    where: { teamId: { in: teams.map((t) => t.id) } },
    select: { teamId: true, nationalRank: true },
  });
  const previousRankByTeam = new Map(existing.map((e) => [e.teamId, e.nationalRank]));

  await prisma.$transaction(
    teamResults.map((r) => {
      const stats = statsBySlug.get(teamBySlug.get(r.teamId) ?? "");
      const data = {
        gamesPlayed: stats?.games_played ?? null,
        rosterCount: stats?.roster_count ?? null,
        rankedPlayerCount: r.rankedPlayerCount,
        pointsPerGame: stats?.points_per_game ?? null,
        reboundsPerGame: stats?.rebounds_per_game ?? null,
        assistsPerGame: stats?.assists_per_game ?? null,
        turnoversPerGame: stats?.turnovers_per_game ?? null,
        stealsPerGame: stats?.steals_per_game ?? null,
        blocksPerGame: stats?.blocks_per_game ?? null,
        fieldGoalPct: stats?.fg_pct ?? null,
        threePointPct: stats?.tp_pct ?? null,
        freeThrowPct: stats?.ft_pct ?? null,
        rating: r.rating,
        rawStrength: r.rawStrength,
        nationalRank: r.nationalRank,
        conferenceRank: r.conferenceRank,
        previousNationalRank: previousRankByTeam.get(r.teamId) ?? null,
        ratingVersion: TEAM_RATING_VERSION,
        computedAt: new Date(),
      };
      return prisma.teamSeasonStat.upsert({
        where: { teamId: r.teamId },
        create: { teamId: r.teamId, ...data },
        update: data,
      });
    }),
  );

  const byConference = new Map<string, typeof teamResults>();
  for (const r of teamResults) {
    if (!r.conferenceId) continue;
    const list = byConference.get(r.conferenceId) ?? [];
    list.push(r);
    byConference.set(r.conferenceId, list);
  }
  const conferenceResults = rateConferences(
    [...byConference.entries()].map(([conferenceId, list]) => ({ conferenceId, teams: list })),
  );

  const existingConf = await prisma.conferenceSeason.findMany({
    where: { seasonId: season.id },
    select: { conferenceId: true, nationalRank: true },
  });
  const previousConfRank = new Map(existingConf.map((c) => [c.conferenceId, c.nationalRank]));

  await prisma.$transaction(
    conferenceResults.map((c) => {
      const data = {
        teamCount: c.teamCount,
        rankedTeamCount: c.rankedTeamCount,
        avgTeamRating: c.avgTeamRating,
        medianTeamRating: c.medianTeamRating,
        topTeamRating: c.topTeamRating,
        top3AvgRating: c.top3AvgRating,
        teamsInTop25: c.teamsInTop25,
        rating: c.rating,
        nationalRank: c.nationalRank,
        previousNationalRank: previousConfRank.get(c.conferenceId) ?? null,
        ratingVersion: CONFERENCE_RATING_VERSION,
        computedAt: new Date(),
      };
      return prisma.conferenceSeason.upsert({
        where: { conferenceId_seasonId: { conferenceId: c.conferenceId, seasonId: season.id } },
        create: { conferenceId: c.conferenceId, sportId: season.sportId, seasonId: season.id, ...data },
        update: data,
      });
    }),
  );

  const teamEntries: SnapshotEntry[] = teamResults
    .filter((r) => r.nationalRank != null && r.rating != null)
    .map((r) => ({ id: r.teamId, rank: r.nationalRank as number, rating: r.rating as number }))
    .sort((a, b) => a.rank - b.rank);
  const confEntries: SnapshotEntry[] = conferenceResults
    .filter((c) => c.nationalRank != null && c.rating != null)
    .map((c) => ({ id: c.conferenceId, rank: c.nationalRank as number, rating: c.rating as number }))
    .sort((a, b) => a.rank - b.rank);

  await prisma.rankingSnapshot.createMany({
    data: [
      {
        sportId: season.sportId,
        seasonId: season.id,
        entityType: RankingEntityType.team,
        version: TEAM_RATING_VERSION,
        entries: teamEntries as unknown as Prisma.InputJsonValue,
      },
      {
        sportId: season.sportId,
        seasonId: season.id,
        entityType: RankingEntityType.conference,
        version: CONFERENCE_RATING_VERSION,
        entries: confEntries as unknown as Prisma.InputJsonValue,
      },
    ],
  });

  return {
    sportCode,
    seasonLabel: season.label,
    teamsRated: teamResults.length,
    teamsRanked: teamEntries.length,
    teamsWithStats: teamResults.filter((r) => statsBySlug.has(teamBySlug.get(r.teamId) ?? "")).length,
    conferencesRated: conferenceResults.length,
  };
}
