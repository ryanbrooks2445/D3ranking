import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteBySlug } from "@/lib/athletes";
import { generatePlayerSummary } from "@/lib/ai/summary";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const key = request.headers.get("x-summary-key");
  const isAdmin =
    process.env.SUMMARY_GENERATION_KEY != null &&
    key != null &&
    key === process.env.SUMMARY_GENERATION_KEY;

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const athlete = await getAthleteBySlug(slug);
  if (!athlete || athlete.seasons.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const seasonId = url.searchParams.get("seasonId");
  const athleteSeason =
    athlete.seasons.find((s) => s.id === seasonId) ?? athlete.seasons[0];

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 503 });
  }

  const summaryMarkdown = await generatePlayerSummary({
    athleteName: athlete.displayName,
    sportLabel: athleteSeason.season.sport.label,
    team: athleteSeason.team?.name,
    conference: athleteSeason.conference?.name,
    ovr: athleteSeason.rating,
    globalRank: athleteSeason.globalRank,
    stats: athleteSeason.stats as Record<string, unknown>,
    segment: athleteSeason.segment,
  });

  const model = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini";

  const saved = await prisma.aiPlayerSummary.upsert({
    where: { athleteSeasonId: athleteSeason.id },
    create: {
      athleteSeasonId: athleteSeason.id,
      model,
      summaryMarkdown,
    },
    update: {
      model,
      summaryMarkdown,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, summary: saved });
}
