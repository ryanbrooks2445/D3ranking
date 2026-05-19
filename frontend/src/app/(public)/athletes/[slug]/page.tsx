import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAthleteBySlug } from "@/lib/athletes";
import { athleteProfileMetadata } from "@/lib/seo";
import { OvrBadge } from "@/components/athlete/OvrBadge";
import { AthleteStatGrid } from "@/components/athlete/AthleteStatGrid";
import { ProfileViewTracker } from "@/components/athlete/ProfileViewTracker";
import { ClaimProfileForm } from "@/components/athlete/ClaimProfileForm";
import { SeasonSelector } from "@/components/athlete/SeasonSelector";
import { slugifyTeam } from "@/lib/slugs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete || athlete.seasons.length === 0) {
    return { title: "Player not found | D3Rank" };
  }
  const s = athlete.seasons[0];
  return athleteProfileMetadata({
    name: athlete.displayName,
    ovr: s.rating,
    sportLabel: s.season.sport.label,
    team: s.team?.name,
    summary: s.aiSummary?.summaryMarkdown,
  });
}

export default async function AthleteProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const { slug } = await params;
  const { seasonId } = await searchParams;
  const athlete = await getAthleteBySlug(slug);
  if (!athlete || athlete.seasons.length === 0) notFound();

  const seasonTabs = athlete.seasons.map((s) => ({
    id: s.id,
    label: `${s.season.sport.label} · ${s.season.label}${s.segment ? ` (${s.segment})` : ""}`,
    sportCode: s.season.sport.code,
  }));

  const activeSeason =
    athlete.seasons.find((s) => s.id === seasonId) ?? athlete.seasons[0];
  const sportCode = activeSeason.season.sport.code;
  const stats = activeSeason.stats as Record<string, unknown>;
  const teamSlug = activeSeason.team ? slugifyTeam(activeSeason.team.name) : null;
  const confCode = activeSeason.conference?.code;

  return (
    <>
      <ProfileViewTracker slug={slug} />
      <article className="space-y-8">
        <header className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-8">
          <nav className="text-sm text-slate-500">
            <Link href="/search" className="hover:text-slate-300">
              Players
            </Link>
            <span className="mx-2">›</span>
            <span className="text-slate-300">{athlete.displayName}</span>
          </nav>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {athlete.displayName}
              </h1>
              <p className="mt-2 text-lg text-slate-300">
                {activeSeason.team?.name ?? "—"}
                {activeSeason.conference?.name ? (
                  <span className="text-slate-500"> · {activeSeason.conference.name}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {activeSeason.season.sport.label} · {activeSeason.season.label}
                {activeSeason.position ? ` · ${activeSeason.position}` : ""}
                {activeSeason.classYear ? ` · ${activeSeason.classYear}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                {activeSeason.globalRank != null && (
                  <span>
                    National rank <strong className="text-white">#{activeSeason.globalRank}</strong>
                  </span>
                )}
                {activeSeason.compositeScore != null && (
                  <span>
                    Score{" "}
                    <strong className="text-white">
                      {Number(activeSeason.compositeScore).toFixed(1)}
                    </strong>
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {teamSlug && (
                  <Link
                    href={`/teams/${sportCode}/${teamSlug}`}
                    className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-slate-600 hover:bg-slate-700"
                  >
                    Team page
                  </Link>
                )}
                {confCode && (
                  <Link
                    href={`/conferences/${sportCode}/${confCode}`}
                    className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-slate-600 hover:bg-slate-700"
                  >
                    Conference rankings
                  </Link>
                )}
                <Link
                  href={`/dashboard/sports/${sportCode}/global`}
                  className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-500/40 hover:bg-blue-600/30"
                >
                  Full {activeSeason.season.sport.label} rankings
                </Link>
              </div>
            </div>
            <OvrBadge rating={activeSeason.rating} />
          </div>
          <Suspense fallback={null}>
            <div className="mt-6">
              <SeasonSelector slug={slug} seasons={seasonTabs} />
            </div>
          </Suspense>
        </header>

        {activeSeason.aiSummary?.summaryMarkdown && (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Scouting summary
            </h2>
            <div className="prose prose-invert mt-3 max-w-none text-sm leading-relaxed text-slate-300">
              {activeSeason.aiSummary.summaryMarkdown.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Season stats</h2>
          <div className="mt-4">
            <AthleteStatGrid
              sportCode={sportCode}
              stats={stats}
              segment={activeSeason.segment || undefined}
            />
          </div>
        </section>

        <ClaimProfileForm slug={slug} />
      </article>
    </>
  );
}
