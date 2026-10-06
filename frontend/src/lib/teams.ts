import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSportSeasonContext } from "@/lib/seasons";
import type { SortDir, SortState } from "@/lib/tableSort";

export const TEAM_RANKINGS_PAGE_SIZE = 50;

const teamRowSelect = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  logoUrl: true,
  conference: { select: { id: true, code: true, name: true } },
  seasonStat: true,
} satisfies Prisma.TeamSelect;

export type TeamRow = Prisma.TeamGetPayload<{ select: typeof teamRowSelect }>;

/** Sortable keys for team ranking tables → Prisma orderBy. */
export const TEAM_SORT_KEYS: Record<string, { defaultDir: SortDir; orderBy: (dir: SortDir) => Prisma.TeamOrderByWithRelationInput[] }> = {
  rank: { defaultDir: "asc", orderBy: (dir) => [{ seasonStat: { nationalRank: { sort: dir, nulls: "last" } } }, { name: "asc" }] },
  team: { defaultDir: "asc", orderBy: (dir) => [{ name: dir }] },
  conference: { defaultDir: "asc", orderBy: (dir) => [{ conference: { name: dir } }, { seasonStat: { nationalRank: { sort: "asc", nulls: "last" } } }] },
  rating: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { rating: { sort: dir, nulls: "last" } } }] },
  ppg: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { pointsPerGame: { sort: dir, nulls: "last" } } }] },
  rpg: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { reboundsPerGame: { sort: dir, nulls: "last" } } }] },
  apg: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { assistsPerGame: { sort: dir, nulls: "last" } } }] },
  fg: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { fieldGoalPct: { sort: dir, nulls: "last" } } }] },
  tp: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { threePointPct: { sort: dir, nulls: "last" } } }] },
  ft: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { freeThrowPct: { sort: dir, nulls: "last" } } }] },
  gp: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { gamesPlayed: { sort: dir, nulls: "last" } } }] },
  ranked: { defaultDir: "desc", orderBy: (dir) => [{ seasonStat: { rankedPlayerCount: { sort: dir, nulls: "last" } } }] },
};

export type TeamRankingsQuery = {
  sportCode: string;
  conferenceCode?: string;
  minGames?: number;
  sort: SortState;
  page: number;
  pageSize?: number;
};

export async function getTeamRankings(q: TeamRankingsQuery): Promise<{
  rows: TeamRow[];
  total: number;
  seasonLabel: string;
} | null> {
  const ctx = await getSportSeasonContext(q.sportCode);
  if (!ctx) return null;
  const pageSize = q.pageSize ?? TEAM_RANKINGS_PAGE_SIZE;

  const where: Prisma.TeamWhereInput = {
    sportId: ctx.sport.id,
    seasonId: ctx.season.id,
    seasonStat: { isNot: null },
    ...(q.conferenceCode ? { conference: { code: q.conferenceCode } } : {}),
    ...(q.minGames ? { seasonStat: { gamesPlayed: { gte: q.minGames } } } : {}),
  };
  const sortDef = TEAM_SORT_KEYS[q.sort.key] ?? TEAM_SORT_KEYS.rank;

  const [rows, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: teamRowSelect,
      orderBy: sortDef.orderBy(q.sort.dir),
      skip: (q.page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.team.count({ where }),
  ]);
  return { rows, total, seasonLabel: ctx.season.label };
}

/** Top-N nationally ranked teams (homepage, rankings hub). */
export const getTopTeams = cache(async (sportCode: string, limit: number): Promise<TeamRow[]> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return [];
  return prisma.team.findMany({
    where: { sportId: ctx.sport.id, seasonId: ctx.season.id, seasonStat: { nationalRank: { not: null } } },
    select: teamRowSelect,
    orderBy: { seasonStat: { nationalRank: "asc" } },
    take: limit,
  });
});

/** All teams in a sport's current season with conference + stats, name order. */
export const listTeamsForSport = cache(async (sportCode: string): Promise<TeamRow[]> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return [];
  return prisma.team.findMany({
    where: { sportId: ctx.sport.id, seasonId: ctx.season.id },
    select: teamRowSelect,
    orderBy: { name: "asc" },
  });
});

const rosterSelect = {
  id: true,
  position: true,
  classYear: true,
  segment: true,
  globalRank: true,
  rating: true,
  compositeScore: true,
  stats: true,
  eligibilityMeta: true,
  athlete: { select: { slug: true, displayName: true } },
} satisfies Prisma.AthleteSeasonSelect;

export type RosterRow = Prisma.AthleteSeasonGetPayload<{ select: typeof rosterSelect }>;

export type TeamProfile = {
  sport: { code: string; label: string };
  season: { id: string; label: string };
  team: TeamRow;
  roster: RosterRow[];
  conferenceTeams: TeamRow[];
  conferenceSeason: { nationalRank: number | null; rating: number | null; teamCount: number } | null;
};

export const getTeamProfile = cache(async (sportCode: string, teamSlug: string): Promise<TeamProfile | null> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return null;

  const team = await prisma.team.findFirst({
    where: { sportId: ctx.sport.id, seasonId: ctx.season.id, slug: teamSlug },
    select: teamRowSelect,
  });
  if (!team) return null;

  const [roster, conferenceTeams, conferenceSeason] = await Promise.all([
    prisma.athleteSeason.findMany({
      where: { teamId: team.id, seasonId: ctx.season.id },
      select: rosterSelect,
      orderBy: [{ globalRank: { sort: "asc", nulls: "last" } }, { athlete: { displayName: "asc" } }],
    }),
    team.conference
      ? prisma.team.findMany({
          where: { sportId: ctx.sport.id, seasonId: ctx.season.id, conferenceId: team.conference.id },
          select: teamRowSelect,
          orderBy: [{ seasonStat: { conferenceRank: { sort: "asc", nulls: "last" } } }, { name: "asc" }],
        })
      : Promise.resolve([]),
    team.conference
      ? prisma.conferenceSeason.findUnique({
          where: { conferenceId_seasonId: { conferenceId: team.conference.id, seasonId: ctx.season.id } },
          select: { nationalRank: true, rating: true, teamCount: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    sport: ctx.sport,
    season: ctx.season,
    team,
    roster,
    conferenceTeams,
    conferenceSeason,
  };
});

/** Legacy helper kept for callers that only need the roster. */
export async function getTeamRoster(sportCode: string, teamSlug: string) {
  const profile = await getTeamProfile(sportCode, teamSlug);
  if (!profile) return null;
  return { season: profile.season, team: profile.team, roster: profile.roster };
}

export async function searchTeams(query: string, limit = 10): Promise<(TeamRow & { sportCode: string; sportLabel: string })[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.team.findMany({
    where: { name: { contains: q, mode: "insensitive" }, season: { isCurrent: true } },
    select: { ...teamRowSelect, sport: { select: { code: true, label: true } } },
    orderBy: [{ name: "asc" }],
    take: limit,
  });
  return rows.map(({ sport, ...rest }) => ({ ...rest, sportCode: sport.code, sportLabel: sport.label }));
}
