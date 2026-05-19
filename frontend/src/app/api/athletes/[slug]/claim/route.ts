import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteBySlug } from "@/lib/athletes";
import { getUserId } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as { email?: string; message?: string };
  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const userId = await getUserId();

  const existing = await prisma.profileClaimRequest.findFirst({
    where: { athleteId: athlete.id, email, status: "pending" },
  });
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, status: "pending" });
  }

  const claim = await prisma.profileClaimRequest.create({
    data: {
      athleteId: athlete.id,
      userId: userId ?? undefined,
      email,
      message: body.message?.trim() || null,
      status: "pending",
    },
  });

  await prisma.athlete.update({
    where: { id: athlete.id },
    data: { claimStatus: "pending" },
  });

  return NextResponse.json({ ok: true, id: claim.id, status: claim.status });
}
