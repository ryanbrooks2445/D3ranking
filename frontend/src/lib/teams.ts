import { prisma } from "@/lib/db";

export async function getTeamRoster(sportCode: string, teamSlug: string, seasonLabel?: string) {
  const season = await prisma.season.findFirst({
    where: {
      sport: { code: sportCode },
      ...(seasonLabel ? { label: seasonLabel } : { isCurrent: true }),
    },
    include: { sport: true },
  });
  if (!season) return null;

  const team = await prisma.team.findFirst({
    where: { sportId: season.sportId, seasonId: season.id, slug: teamSlug },
    include: { conference: true },
  });
  if (!team) return null;

  const roster = await prisma.athleteSeason.findMany({
    where: { teamId: team.id, seasonId: season.id },
    include: {
      athlete: { select: { slug: true, displayName: true } },
    },
    orderBy: [{ globalRank: "asc" }],
  });

  return { season, team, roster };
}

export async function listTeamsForSport(sportCode: string) {
  const season = await prisma.season.findFirst({
    where: { sport: { code: sportCode }, isCurrent: true },
  });
  if (!season) return [];

  return prisma.team.findMany({
    where: { seasonId: season.id },
    include: { conference: true },
    orderBy: { name: "asc" },
  });
}
