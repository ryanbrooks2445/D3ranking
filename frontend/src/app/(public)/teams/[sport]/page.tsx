import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { listTeamsForSport } from "@/lib/teams";
import { getSportsWithTeamRankings } from "@/lib/seasons";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { conferenceShortName, formatRank, formatRating } from "@/lib/format";
import { SITE_URL } from "@/lib/nav";
import { PageHeader } from "@/components/ui/PageHeader";
import { SportSwitcher } from "@/components/SportSwitcher";
import { SportUnavailable } from "@/components/SportUnavailable";

type Params = Promise<{ sport: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport);
  if (!def) return { title: "Teams" };
  return {
    title: `Division III ${def.label} Teams`,
    description: `Every NCAA Division III ${def.label.toLowerCase()} program by conference with national rank and D3Rank team rating.`,
    alternates: { canonical: `${SITE_URL}/teams/${def.code}` },
  };
}

export default async function TeamsBySportPage({ params }: { params: Params }) {
  const { sport } = await params;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  const [teams, available] = await Promise.all([listTeamsForSport(code), getSportsWithTeamRankings()]);
  const enabled = new Set(available.map((s) => s.code));

  const byConference = new Map<string, { code: string; name: string; teams: typeof teams }>();
  for (const t of teams) {
    const key = t.conference?.code ?? "independent";
    const entry = byConference.get(key) ?? {
      code: key,
      name: t.conference ? formatConferenceDisplayName(t.conference.name, t.conference.code) : "Independent",
      teams: [],
    };
    entry.teams.push(t);
    byConference.set(key, entry);
  }
  const groups = [...byConference.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Teams" }, { label: def.label }]}
        eyebrow="Teams"
        title={`Division III ${def.label}`}
        meta={teams.length > 0 ? `${teams.length} programs across ${groups.length} conferences` : undefined}
      />
      <SportSwitcher current={code} hrefFor={(c) => `/teams/${c}`} enabled={enabled} />

      {teams.length === 0 ? (
        <SportUnavailable sportCode={code} feature="Team pages" availableSports={available} hrefForSport={(c) => `/teams/${c}`} />
      ) : (
        <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
          {groups.map((g) => (
            <section key={g.code} className="mb-8 break-inside-avoid">
              <h2 className="flex items-baseline justify-between border-b border-slate-700 pb-1.5 text-sm font-bold text-white">
                {g.code !== "independent" ? (
                  <Link href={`/conferences/${code}/${g.code}`} className="hover:text-blue-300">
                    {conferenceShortName(g.name, g.code)}
                  </Link>
                ) : (
                  g.name
                )}
                <span className="text-xs font-normal text-slate-500">{g.teams.length} teams</span>
              </h2>
              <ul className="mt-1">
                {[...g.teams]
                  .sort((a, b) => (a.seasonStat?.conferenceRank ?? 999) - (b.seasonStat?.conferenceRank ?? 999))
                  .map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 border-b border-slate-800/70 py-1.5 text-sm">
                      <Link href={`/teams/${code}/${t.slug}`} className="min-w-0 truncate text-slate-200 hover:text-white">
                        {t.name}
                      </Link>
                      <span className="num flex shrink-0 gap-3 text-xs text-slate-500">
                        <span className={t.seasonStat?.nationalRank == null ? "text-slate-700" : "text-slate-300"}>
                          {formatRank(t.seasonStat?.nationalRank)}
                        </span>
                        <span className="w-9 text-right">{formatRating(t.seasonStat?.rating)}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
