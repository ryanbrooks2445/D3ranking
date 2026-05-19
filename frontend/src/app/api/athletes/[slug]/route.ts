import { NextResponse } from "next/server";
import { getAthleteBySlug } from "@/lib/athletes";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(athlete);
}
