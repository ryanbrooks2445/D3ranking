import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSportSeasonContext } from "@/lib/seasons";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { type TeamRow } from "@/lib/teams";
import { sortRows, type SortDir, type SortState } from "@/lib/tableSort";

const conferenceSeasonSelect = {
  id: true,
  teamCount: true,
  rankedTeamCount: true,
  avgTeamRating: true,
  medianTeamRating: true,
  topTeamRating: true,
  top3AvgRating: true,
  teamsInTop25: true,
  rating: true,
  nationalRank: true,
  previousNationalRank: true,
  computedAt: true,
  conference: { select: { id: true, code: true, name: true, region: true } },
} satisfies Prisma.ConferenceSeasonSelect;

export type ConferenceSeasonRow = Prisma.ConferenceSeasonGetPayload<{ select: typeof conferenceSeasonSelect }> & {
  displayName: string;
};

function withDisplayName<T extends { conference: { code: string; name: string } }>(row: T): T & { displayName: string } {
  return { ...row, displayName: formatConferenceDisplayName(row.conference.name, row.conference.code) };
}

export const CONFERENCE_SORT_KEYS: Record<string, { defaultDir: SortDir; accessor: (r: ConferenceSeasonRow) => unknown }> = {
  rank: { defaultDir: "asc", accessor: (r) => r.nationalRank },
  conference: { defaultDir: "asc", accessor: (r) => r.displayName },
  rating: { defaultDir: "desc", accessor: (r) => r.rating },
  avg: { defaultDir: "desc", accessor: (r) => r.avgTeamRating },
  median: { defaultDir: "desc", accessor: (r) => r.medianTeamRating },
  top: { defaultDir: "desc", accessor: (r) => r.topTeamRating },
  top3: { defaultDir: "desc", accessor: (r) => r.top3AvgRating },
  top25: { defaultDir: "desc", accessor: (r) => r.teamsInTop25 },
  teams: { defaultDir: "desc", accessor: (r) => r.teamCount },
};

/** Conference rankings for a sport's current season. Small table: sorted in memory. */
export const getConferenceRankings = cache(
  async (sportCode: string, sort?: SortState): Promise<{ rows: ConferenceSeasonRow[]; seasonLabel: string } | null> => {
    const ctx = await getSportSeasonContext(sportCode);
    if (!ctx) return null;
    const raw = await prisma.conferenceSeason.findMany({
      where: { seasonId: ctx.season.id, sportId: ctx.sport.id },
      select: conferenceSeasonSelect,
      orderBy: [{ nationalRank: { sort: "asc", nulls: "last" } }, { conference: { name: "asc" } }],
    });
    let rows = raw.map(withDisplayName);
    if (sort && sort.key !== "rank") {
      const def = CONFERENCE_SORT_KEYS[sort.key];
      if (def) rows = sortRows(rows, def.accessor, sort.dir);
    } else if (sort?.dir === "desc") {
      rows = [...rows].reverse();
    }
    return { rows, seasonLabel: ctx.season.label };
  },
);

export type ConferenceProfile = {
  sport: { code: string; label: string };
  season: { id: string; label: string };
  conference: { id: string; code: string; name: string; displayName: string };
  conferenceSeason: Omit<ConferenceSeasonRow, "conference" | "displayName"> | null;
  teams: TeamRow[];
};

export const getConferenceProfile = cache(async (sportCode: string, confCode: string): Promise<ConferenceProfile | null> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return null;
  const conference = await prisma.conference.findUnique({
    where: { code: confCode.toLowerCase() },
    select: { id: true, code: true, name: true },
  });
  if (!conference) return null;

  const [conferenceSeason, teams] = await Promise.all([
    prisma.conferenceSeason.findUnique({
      where: { conferenceId_seasonId: { conferenceId: conference.id, seasonId: ctx.season.id } },
      select: { ...conferenceSeasonSelect, conference: false },
    }),
    prisma.team.findMany({
      where: { sportId: ctx.sport.id, seasonId: ctx.season.id, conferenceId: conference.id },
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        logoUrl: true,
        conference: { select: { id: true, code: true, name: true } },
        seasonStat: true,
      },
      orderBy: [{ seasonStat: { conferenceRank: { sort: "asc", nulls: "last" } } }, { name: "asc" }],
    }),
  ]);
  if (teams.length === 0 && !conferenceSeason) return null;

  return {
    sport: ctx.sport,
    season: ctx.season,
    conference: { ...conference, displayName: formatConferenceDisplayName(conference.name, conference.code) },
    conferenceSeason,
    teams,
  };
});

/** Conferences that have teams in a sport's current season (for filters and indexes). */
export const listConferencesForSport = cache(async (sportCode: string): Promise<{ code: string; name: string; displayName: string }[]> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return [];
  const rows = await prisma.conference.findMany({
    where: { teams: { some: { sportId: ctx.sport.id, seasonId: ctx.season.id } } },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows.map((c) => ({ ...c, displayName: formatConferenceDisplayName(c.name, c.code) }));
});

export async function searchConferences(query: string, limit = 8) {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.conference.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] },
    select: { code: true, name: true, teams: { where: { season: { isCurrent: true } }, select: { sport: { select: { code: true } } }, take: 50 } },
    take: limit,
    orderBy: { name: "asc" },
  });
  return rows.map((c) => ({
    code: c.code,
    name: c.name,
    displayName: formatConferenceDisplayName(c.name, c.code),
    sportCodes: [...new Set(c.teams.map((t) => t.sport.code))],
  }));
}
