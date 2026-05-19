import { NextResponse } from "next/server";
import { getTrendingAthletes } from "@/lib/athletes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days") ?? 7), 30);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10), 25);

  const trending = await getTrendingAthletes(days, limit);
  return NextResponse.json({
    trending: trending.map((t) => ({
      slug: t.athlete.slug,
      displayName: t.athlete.displayName,
      views: t.views,
      topSeason: t.athlete.seasons[0]
        ? {
            sport: t.athlete.seasons[0].season.sport.code,
            sportLabel: t.athlete.seasons[0].season.sport.label,
            team: t.athlete.seasons[0].team?.name,
            rating: t.athlete.seasons[0].rating,
          }
        : null,
    })),
  });
}
