import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { getRankedPlayerSeasons, getStatLeaders, type StatLeader } from "@/lib/players";
import { getLeaderCategories } from "@/lib/statCategories";
import { listConferencesForSport } from "@/lib/conferenceSeasons";
import { getSportSeasonContext } from "@/lib/seasons";
import { SITE_URL } from "@/lib/nav";
import { conferenceShortName, formatStat } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { SportSwitcher } from "@/components/SportSwitcher";
import { StatLeaderTable } from "@/components/player/StatLeaderTable";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ conference?: string; category?: string }>;

const OVERVIEW_LIMIT = 10;
const FULL_LIMIT = 100;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { sport } = await params;
  const { category } = await searchParams;
  const def = getSport(sport.toLowerCase());
  if (!def) return { title: "Stat Leaders" };
  const cat = getLeaderCategories(def.code).find((c) => c.key === category);
  return {
    title: cat ? `${def.label} ${cat.label} Leaders` : `Division III ${def.label} Stat Leaders`,
    description: `NCAA Division III ${def.label.toLowerCase()} statistical leaders${cat ? ` in ${cat.label.toLowerCase()}` : ""}, filterable by conference.`,
    alternates: { canonical: `${SITE_URL}/stats/${def.code}${cat ? `?category=${cat.key}` : ""}` },
  };
}

export default async function StatsPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const sp = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  const categories = getLeaderCategories(code);
  const selected = categories.find((c) => c.key === sp.category);
  const conferenceCode = sp.conference?.toLowerCase() || undefined;

  const [ctx, conferences] = await Promise.all([getSportSeasonContext(code), listConferencesForSport(code)]);
  const players = ctx ? await getRankedPlayerSeasons(code, conferenceCode) : [];
  const conference = conferenceCode ? conferences.find((c) => c.code === conferenceCode) : undefined;
  const basePath = `/stats/${code}`;
  const scope = conference ? conference.displayName : "all Division III";

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Stats" }, { label: def.label }, ...(selected ? [{ label: selected.label }] : [])]}
        eyebrow="Statistical leaders"
        title={selected ? `${def.label} ${selected.label} Leaders` : `Division III ${def.label} Stat Leaders`}
        meta={ctx ? `${players.length.toLocaleString()} ranked players · ${scope} · ${ctx.season.label}` : undefined}
      />
      <SportSwitcher current={code} hrefFor={(c) => `/stats/${c}`} />

      {!ctx || players.length === 0 || categories.length === 0 ? (
        <EmptyState
          title={`Stat leaders are not yet available for ${def.label}.`}
          body={
            <p>
              Leaderboards require synced per-player season stats.{" "}
              <Link href={`/rankings/players/${code}`} className="text-blue-400 hover:text-blue-300">
                View {def.label} player rankings →
              </Link>
            </p>
          }
        />
      ) : (
        <>
          <FilterBar
            basePath={basePath}
            activeCount={[conferenceCode, selected].filter(Boolean).length}
            fields={[
              {
                name: "category",
                label: "Category",
                value: selected?.key,
                allLabel: "All categories",
                options: categories.map((c) => ({ value: c.key, label: c.label })),
              },
              {
                name: "conference",
                label: "Conference",
                value: conferenceCode,
                allLabel: "All conferences",
                options: conferences.map((c) => ({ value: c.code, label: `${conferenceShortName(c.name, c.code)} — ${c.displayName}` })),
              },
            ]}
          />

          {selected ? (
            <FullLeaderboard leaders={getStatLeaders(players, selected, FULL_LIMIT)} sportCode={code} category={selected} showConference={!conference} />
          ) : (
            <section aria-labelledby="leaders">
              <SectionHeading id="leaders" title="Leaders by category" subtitle={`Top ${OVERVIEW_LIMIT} in each category`} />
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((c) => (
                  <StatLeaderTable
                    key={c.key}
                    category={c}
                    leaders={getStatLeaders(players, c, OVERVIEW_LIMIT)}
                    sportCode={code}
                    href={`${basePath}?category=${c.key}${conferenceCode ? `&conference=${conferenceCode}` : ""}`}
                  />
                ))}
              </div>
            </section>
          )}

          <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
            Leaders include only players who meet the ranking thresholds for games and minutes played, so single-game
            outliers do not appear. Values are season per-game or rate figures as published by the NCAA.
          </p>
        </>
      )}
    </div>
  );
}

function FullLeaderboard({
  leaders,
  sportCode,
  category,
  showConference,
}: {
  leaders: StatLeader[];
  sportCode: string;
  category: ReturnType<typeof getLeaderCategories>[number];
  showConference: boolean;
}) {
  const columns: DataColumn<StatLeader>[] = [
    { key: "rank", label: "Rk", numeric: true, render: (_, i) => <span className="font-semibold">{i + 1}</span> },
    {
      key: "player",
      label: "Player",
      render: ({ row }) => (
        <Link href={`/athletes/${row.athlete.slug}`} className="font-semibold text-white">
          {row.athlete.displayName}
        </Link>
      ),
    },
    { key: "pos", label: "Pos", hideBelow: "sm", render: ({ row }) => row.position ?? "—" },
    {
      key: "team",
      label: "Team",
      render: ({ row }) =>
        row.team ? (
          <Link href={`/teams/${sportCode}/${row.team.slug}`} className="text-slate-300">
            {row.team.name}
          </Link>
        ) : (
          "—"
        ),
    },
    ...(showConference
      ? [
          {
            key: "conf",
            label: "Conference",
            abbr: "Conf",
            hideBelow: "md" as const,
            render: ({ row }: StatLeader) =>
              row.conference ? (
                <Link href={`/conferences/${sportCode}/${row.conference.code}`} className="text-slate-400">
                  {conferenceShortName(row.conference.name, row.conference.code)}
                </Link>
              ) : (
                "—"
              ),
          },
        ]
      : []),
    {
      key: "value",
      label: category.abbr,
      title: category.label,
      numeric: true,
      render: ({ value }) => <span className="font-semibold text-white">{formatStat(value, category.kind)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={leaders}
      rowKey={(l) => l.row.id}
      emptyMessage="No qualifying players."
      caption={`${category.label} leaders`}
    />
  );
}
