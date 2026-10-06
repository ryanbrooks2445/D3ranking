import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { getConferenceRankings, CONFERENCE_SORT_KEYS } from "@/lib/conferenceSeasons";
import { getSportsWithTeamRankings } from "@/lib/seasons";
import { parseSort } from "@/lib/tableSort";
import { SITE_URL } from "@/lib/nav";
import { CONFERENCE_RATING_METHODOLOGY } from "@/lib/ranking/methodology";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SportSwitcher } from "@/components/SportSwitcher";
import { SportUnavailable } from "@/components/SportUnavailable";
import { ConferenceRankingTable } from "@/components/conference/ConferenceRankingTable";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ sort?: string; dir?: string }>;

const SORT_DEFS = Object.entries(CONFERENCE_SORT_KEYS).map(([key, v]) => ({ key, defaultDir: v.defaultDir }));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport);
  if (!def) return { title: "Conference Rankings" };
  return {
    title: `Division III ${def.label} Conference Rankings`,
    description: `Which NCAA Division III ${def.label.toLowerCase()} conferences are strongest? National conference rankings built from D3Rank team ratings: average strength, top-end strength, and nationally ranked teams.`,
    alternates: { canonical: `${SITE_URL}/rankings/conferences/${def.code}` },
  };
}

export default async function ConferenceRankingsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const sp = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  const sort = parseSort(sp, SORT_DEFS, { key: "rank", dir: "asc" });
  const [result, available] = await Promise.all([getConferenceRankings(code, sort), getSportsWithTeamRankings()]);
  const enabled = new Set(available.map((s) => s.code));
  const basePath = `/rankings/conferences/${code}`;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Rankings", href: "/rankings" }, { label: "Conferences" }, { label: def.label }]}
        eyebrow="National conference rankings"
        title={`Division III ${def.label} Conference Rankings`}
        meta={result && result.rows.length > 0 ? `${result.rows.length} conferences · ${result.seasonLabel}` : undefined}
      />
      <SportSwitcher current={code} hrefFor={(c) => `/rankings/conferences/${c}`} enabled={enabled} />

      {!result || result.rows.length === 0 ? (
        <SportUnavailable sportCode={code} feature="Conference rankings" availableSports={available} hrefForSport={(c) => `/rankings/conferences/${c}`} />
      ) : (
        <>
          <ConferenceRankingTable rows={result.rows} sportCode={code} sort={{ basePath, params: sp, current: sort }} />
          <section aria-labelledby="methodology" className="max-w-3xl pt-4">
            <SectionHeading id="methodology" title="Methodology" />
            {CONFERENCE_RATING_METHODOLOGY.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Median and best-team columns are shown for context and do not enter the formula. Conferences with fewer
              than two rated teams are not ranked.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
