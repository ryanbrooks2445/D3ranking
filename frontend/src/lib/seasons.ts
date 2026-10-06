import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSport } from "@/lib/sports";

export type SportSeasonContext = {
  sport: { id: string; code: string; label: string };
  season: { id: string; label: string };
};

/** Current DB season for a sport, or null when the sport has not been synced. */
export const getSportSeasonContext = cache(async (sportCode: string): Promise<SportSeasonContext | null> => {
  const code = sportCode.toLowerCase();
  const season = await prisma.season.findFirst({
    where: { sport: { code }, isCurrent: true },
    select: { id: true, label: true, sport: { select: { id: true, code: true, label: true } } },
  });
  if (!season) return null;
  return {
    sport: { id: season.sport.id, code: season.sport.code, label: getSport(code)?.label ?? season.sport.label },
    season: { id: season.id, label: season.label },
  };
});

/** Sports that have persisted team ratings for their current season. */
export const getSportsWithTeamRankings = cache(async (): Promise<{ code: string; label: string }[]> => {
  const sports = await prisma.sport.findMany({
    where: { teams: { some: { season: { isCurrent: true }, seasonStat: { rating: { not: null } } } } },
    select: { code: true, label: true },
    orderBy: { code: "asc" },
  });
  return sports.map((s) => ({ code: s.code, label: getSport(s.code)?.label ?? s.label }));
});

export async function hasTeamRankings(sportCode: string): Promise<boolean> {
  const sports = await getSportsWithTeamRankings();
  return sports.some((s) => s.code === sportCode.toLowerCase());
}
