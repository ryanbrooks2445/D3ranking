import { prisma } from "@/lib/db";
import type { Athlete, AthleteSeason, AiPlayerSummary, Conference, Season, Sport, Team } from "@prisma/client";

export type AthleteSeasonWithRelations = AthleteSeason & {
  season: Season & { sport: Sport };
  team: Team | null;
  conference: Conference | null;
  aiSummary: AiPlayerSummary | null;
};

export type AthleteProfile = Athlete & {
  seasons: AthleteSeasonWithRelations[];
};

export async function getAthleteBySlug(slug: string): Promise<AthleteProfile | null> {
  return prisma.athlete.findUnique({
    where: { slug },
    include: {
      seasons: {
        include: {
          season: { include: { sport: true } },
          team: true,
          conference: true,
          aiSummary: true,
        },
        orderBy: [{ season: { label: "desc" } }, { rating: "desc" }],
      },
    },
  });
}

/** Slug lookup for ranking table links: key = sport|displayName|team|segment (lowercase). */
export async function getProfileSlugMapForSport(sportCode: string): Promise<Map<string, string>> {
  const seasons = await prisma.athleteSeason.findMany({
    where: {
      season: { sport: { code: sportCode }, isCurrent: true },
    },
    include: {
      athlete: { select: { slug: true, displayName: true } },
      team: { select: { name: true } },
    },
  });

  const map = new Map<string, string>();
  for (const s of seasons) {
    const slug = s.athlete.slug;
    const display = s.athlete.displayName;
    const team = s.team?.name ?? "";
    const segment = s.segment ?? "";
    map.set(`${sportCode}|${display}|${team}|${segment}`.toLowerCase(), slug);
    map.set(`${sportCode}|${display}`.toLowerCase(), slug);
  }
  return map;
}

export async function getAthleteSlugMap(
  keys: { sportCode: string; playerName: string; team?: string; segment?: string }[],
): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();

  const athletes = await prisma.athlete.findMany({
    select: {
      slug: true,
      displayName: true,
      seasons: {
        select: {
          segment: true,
          team: { select: { name: true } },
          season: { select: { sport: { select: { code: true } } } },
        },
      },
    },
  });

  const map = new Map<string, string>();
  for (const a of athletes) {
    for (const s of a.seasons) {
      const sportCode = s.season.sport.code;
      const team = s.team?.name ?? "";
      const segment = s.segment ?? "";
      const lookupKey = `${sportCode}|${a.displayName}|${team}|${segment}`.toLowerCase();
      map.set(lookupKey, a.slug);
      map.set(`${sportCode}|${a.displayName}`.toLowerCase(), a.slug);
    }
  }
  return map;
}

type SlugLookup = Map<string, string> | Record<string, string>;

function slugLookupGet(map: SlugLookup, key: string): string | undefined {
  if (map instanceof Map) return map.get(key);
  return map[key];
}

export function lookupSlugFromMap(
  map: SlugLookup,
  sportCode: string,
  playerName: string,
  team?: string,
  segment?: string,
): string | null {
  const display = playerName.trim();
  const t = (team ?? "").trim();
  const seg = (segment ?? "").trim().toLowerCase();
  return (
    slugLookupGet(map, `${sportCode}|${display}|${t}|${seg}`.toLowerCase()) ??
    slugLookupGet(map, `${sportCode}|${display}`.toLowerCase()) ??
    null
  );
}

export function slugMapToRecord(map: Map<string, string>): Record<string, string> {
  return Object.fromEntries(map);
}

export async function searchAthletes(query: string, sportCode?: string, limit = 25) {
  const q = query.trim();
  if (q.length < 2) return [];

  return prisma.athlete.findMany({
    where: {
      displayName: { contains: q, mode: "insensitive" },
      ...(sportCode
        ? {
            seasons: {
              some: { season: { sport: { code: sportCode } } },
            },
          }
        : {}),
    },
    include: {
      seasons: {
        where: sportCode ? { season: { sport: { code: sportCode } } } : undefined,
        include: {
          season: { include: { sport: true } },
          team: true,
        },
        orderBy: { rating: "desc" },
        take: 1,
      },
    },
    take: limit,
    orderBy: { displayName: "asc" },
  });
}

export async function getTrendingAthletes(days = 7, limit = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const grouped = await prisma.profileView.groupBy({
    by: ["athleteId"],
    where: { createdAt: { gte: since } },
    _count: { athleteId: true },
    orderBy: { _count: { athleteId: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const ids = grouped.map((g) => g.athleteId);
  const athletes = await prisma.athlete.findMany({
    where: { id: { in: ids } },
    include: {
      seasons: {
        include: {
          season: { include: { sport: true } },
          team: true,
        },
        orderBy: { rating: "desc" },
        take: 1,
      },
    },
  });

  const byId = new Map(athletes.map((a) => [a.id, a]));
  return grouped
    .map((g) => ({
      athlete: byId.get(g.athleteId),
      views: g._count.athleteId,
    }))
    .filter((x): x is { athlete: NonNullable<typeof x.athlete>; views: number } => !!x.athlete);
}

export async function recordProfileView(athleteId: string, sessionId?: string, ipHash?: string) {
  return prisma.profileView.create({
    data: { athleteId, sessionId, ipHash },
  });
}
