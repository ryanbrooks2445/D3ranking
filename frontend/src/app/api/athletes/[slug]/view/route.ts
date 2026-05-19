import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAthleteBySlug, recordProfileView } from "@/lib/athletes";

function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let sessionId: string | undefined;
  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId;
  } catch {
    sessionId = undefined;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? null;

  await recordProfileView(athlete.id, sessionId, hashIp(ip));
  return NextResponse.json({ ok: true });
}
