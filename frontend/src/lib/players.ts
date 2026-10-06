import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSportSeasonContext } from "@/lib/seasons";
import type { StatCategory } from "@/lib/statCategories";

const playerSeasonSelect = {
  id: true,
  position: true,
  classYear: true,
  segment: true,
  globalRank: true,
  rating: true,
  compositeScore: true,
  stats: true,
  athlete: { select: { slug: true, displayName: true } },
  team: { select: { slug: true, name: true } },
  conference: { select: { code: true, name: true } },
} satisfies Prisma.AthleteSeasonSelect;

export type PlayerSeasonRow = Prisma.AthleteSeasonGetPayload<{ select: typeof playerSeasonSelect }>;

export function statValue(row: PlayerSeasonRow, key: string): number | null {
  const v = (row.stats as Record<string, unknown> | null)?.[key];
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Top-N players by national rank for a sport's current season. */
export const getTopPlayers = cache(async (sportCode: string, limit: number, conferenceCode?: string): Promise<PlayerSeasonRow[]> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return [];
  return prisma.athleteSeason.findMany({
    where: {
      seasonId: ctx.season.id,
      globalRank: { not: null },
      ...(conferenceCode ? { conference: { code: conferenceCode } } : {}),
    },
    select: playerSeasonSelect,
    orderBy: { globalRank: "asc" },
    take: limit,
  });
});

/**
 * All ranked player-seasons for a sport (a few thousand small rows). Used for
 * stat leaders, which need to sort on JSON stat keys that Prisma cannot order by.
 */
export const getRankedPlayerSeasons = cache(async (sportCode: string, conferenceCode?: string): Promise<PlayerSeasonRow[]> => {
  const ctx = await getSportSeasonContext(sportCode);
  if (!ctx) return [];
  return prisma.athleteSeason.findMany({
    where: {
      seasonId: ctx.season.id,
      globalRank: { not: null },
      ...(conferenceCode ? { conference: { code: conferenceCode } } : {}),
    },
    select: playerSeasonSelect,
  });
});

export type StatLeader = { row: PlayerSeasonRow; value: number };

export function getStatLeaders(rows: PlayerSeasonRow[], category: StatCategory, limit: number): StatLeader[] {
  const leaders: StatLeader[] = [];
  for (const row of rows) {
    const value = statValue(row, category.key);
    if (value == null) continue;
    if (value === 0 && !category.lowerIsBetter) continue;
    leaders.push({ row, value });
  }
  leaders.sort((a, b) => (category.lowerIsBetter ? a.value - b.value : b.value - a.value));
  return leaders.slice(0, limit);
}
