import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { getTeamRankings, TEAM_RANKINGS_PAGE_SIZE, TEAM_SORT_KEYS } from "@/lib/teams";
import { listConferencesForSport } from "@/lib/conferenceSeasons";
import { getSportsWithTeamRankings } from "@/lib/seasons";
import { parseSort } from "@/lib/tableSort";
import { SITE_URL } from "@/lib/nav";
import { conferenceShortName } from "@/lib/format";
import { TEAM_RATING_METHODOLOGY } from "@/lib/ranking/methodology";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SportSwitcher } from "@/components/SportSwitcher";
import { SportUnavailable } from "@/components/SportUnavailable";
import { TeamRankingTable } from "@/components/team/TeamRankingTable";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ sort?: string; dir?: string; conference?: string; minGames?: string; page?: string }>;

const MIN_GAMES_OPTIONS = ["10", "15", "20", "25"];
const SORT_DEFS = Object.entries(TEAM_SORT_KEYS).map(([key, v]) => ({ key, defaultDir: v.defaultDir }));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport);
  if (!def) return { title: "Team Rankings" };
  return {
    title: `Division III ${def.label} Team Rankings`,
    description: `National NCAA Division III ${def.label.toLowerCase()} team rankings with D3Rank rating, scoring, shooting percentages, and conference. Filter by conference and games played.`,
    alternates: { canonical: `${SITE_URL}/rankings/teams/${def.code}` },
  };
}

export default async function TeamRankingsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const sp = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  const sort = parseSort(sp, SORT_DEFS, { key: "rank", dir: "asc" });
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const minGames = MIN_GAMES_OPTIONS.includes(sp.minGames ?? "") ? Number(sp.minGames) : undefined;
  const conferenceCode = sp.conference?.toLowerCase() || undefined;

  const [result, conferences, available] = await Promise.all([
    getTeamRankings({ sportCode: code, conferenceCode, minGames, sort, page }),
    listConferencesForSport(code),
    getSportsWithTeamRankings(),
  ]);
  const enabled = new Set(available.map((s) => s.code));
  const basePath = `/rankings/teams/${code}`;
  const params_ = { sort: sp.sort, dir: sp.dir, conference: sp.conference, minGames: sp.minGames };
  const activeFilters = [conferenceCode, minGames].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Rankings", href: "/rankings" }, { label: "Teams" }, { label: def.label }]}
        eyebrow="National team rankings"
        title={`Division III ${def.label} Team Rankings`}
        meta={
          result
            ? `${result.total.toLocaleString()} teams · ${result.seasonLabel} · ratings scaled to a national average of 50`
            : undefined
        }
      />
      <SportSwitcher current={code} hrefFor={(c) => `/rankings/teams/${c}`} enabled={enabled} />

      {!result || !enabled.has(code) ? (
        <SportUnavailable sportCode={code} feature="Team rankings" availableSports={available} hrefForSport={(c) => `/rankings/teams/${c}`} />
      ) : (
        <>
          <FilterBar
            basePath={basePath}
            preserve={{ sort: sp.sort, dir: sp.dir }}
            activeCount={activeFilters}
            fields={[
              {
                name: "conference",
                label: "Conference",
                value: conferenceCode,
                allLabel: "All conferences",
                options: conferences.map((c) => ({ value: c.code, label: `${conferenceShortName(c.name, c.code)} — ${c.displayName}` })),
              },
              {
                name: "minGames",
                label: "Minimum games",
                value: sp.minGames,
                allLabel: "Any",
                options: MIN_GAMES_OPTIONS.map((g) => ({ value: g, label: `${g}+ games` })),
              },
            ]}
          />

          <TeamRankingTable rows={result.rows} sportCode={code} sort={{ basePath, params: params_, current: sort }} />

          <Pagination basePath={basePath} params={params_} page={page} pageSize={TEAM_RANKINGS_PAGE_SIZE} total={result.total} />

          <section aria-labelledby="methodology" className="max-w-3xl pt-4">
            <SectionHeading id="methodology" title="Methodology" />
            {TEAM_RATING_METHODOLOGY.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-slate-400">
                {p}
              </p>
            ))}
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Teams listed as NR did not meet the minimum thresholds; their rating is still shown for reference.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
