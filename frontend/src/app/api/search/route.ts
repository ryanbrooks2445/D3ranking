import { NextResponse } from "next/server";
import { searchAthletes } from "@/lib/athletes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const sport = url.searchParams.get("sport") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 50);

  const results = await searchAthletes(q, sport, limit);
  return NextResponse.json({
    results: results.map((a) => ({
      slug: a.slug,
      displayName: a.displayName,
      topSeason: a.seasons[0]
        ? {
            sport: a.seasons[0].season.sport.code,
            sportLabel: a.seasons[0].season.sport.label,
            team: a.seasons[0].team?.name,
            rating: a.seasons[0].rating,
            globalRank: a.seasons[0].globalRank,
          }
        : null,
    })),
  });
}
