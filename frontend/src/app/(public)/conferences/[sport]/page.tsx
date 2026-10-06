import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSport } from "@/lib/sports";
import { getConferenceRankings, CONFERENCE_SORT_KEYS } from "@/lib/conferenceSeasons";
import { getSportsWithTeamRankings } from "@/lib/seasons";
import { readDataFileSafe } from "@/lib/data";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { parseSort } from "@/lib/tableSort";
import { SITE_URL } from "@/lib/nav";
import { PageHeader } from "@/components/ui/PageHeader";
import { SportSwitcher } from "@/components/SportSwitcher";
import { ConferenceRankingTable } from "@/components/conference/ConferenceRankingTable";
import { EmptyState } from "@/components/ui/EmptyState";

type Params = Promise<{ sport: string }>;
type Search = Promise<{ sort?: string; dir?: string }>;

type ConfIndexRow = { conference_code: string; conference: string; player_count?: number; ranked_count?: number };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport);
  if (!def) return { title: "Conferences" };
  return {
    title: `Division III ${def.label} Conferences`,
    description: `Every NCAA Division III ${def.label.toLowerCase()} conference with national conference rank, strength rating, and standings.`,
    alternates: { canonical: `${SITE_URL}/conferences/${def.code}` },
  };
}

const SORT_DEFS = Object.entries(CONFERENCE_SORT_KEYS).map(([key, v]) => ({ key, defaultDir: v.defaultDir }));

export default async function ConferencesBySportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { sport } = await params;
  const sp = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  if (!def) notFound();

  const sort = parseSort(sp, SORT_DEFS, { key: "conference", dir: "asc" });
  const [ranked, available] = await Promise.all([getConferenceRankings(code, sort), getSportsWithTeamRankings()]);
  const enabled = new Set(available.map((s) => s.code));
  const basePath = `/conferences/${code}`;

  let fallback: ConfIndexRow[] = [];
  if (!ranked || ranked.rows.length === 0) {
    const raw = await readDataFileSafe(`sports/${code}/conferences/index.json`);
    if (raw) {
      try {
        fallback = (JSON.parse(raw) as ConfIndexRow[]).sort((a, b) => (a.conference ?? "").localeCompare(b.conference ?? ""));
      } catch {
        fallback = [];
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Conferences" }, { label: def.label }]}
        eyebrow="Conferences"
        title={`Division III ${def.label} Conferences`}
        meta={
          ranked && ranked.rows.length > 0
            ? `${ranked.rows.length} conferences · ${ranked.seasonLabel} · sort any column or view the national conference rankings`
            : fallback.length > 0
              ? `${fallback.length} conferences with player rankings`
              : undefined
        }
        actions={
          ranked && ranked.rows.length > 0 ? (
            <Link
              href={`/rankings/conferences/${code}`}
              className="inline-flex h-9 items-center rounded border border-slate-600 px-3 text-sm font-medium text-slate-200 hover:border-slate-400 hover:text-white"
            >
              Conference rankings
            </Link>
          ) : undefined
        }
      />
      <SportSwitcher current={code} hrefFor={(c) => `/conferences/${c}`} enabled={enabled} />

      {ranked && ranked.rows.length > 0 ? (
        <ConferenceRankingTable rows={ranked.rows} sportCode={code} sort={{ basePath, params: sp, current: sort }} />
      ) : fallback.length > 0 ? (
        <>
          <p className="text-sm text-slate-500">
            Conference strength ratings are not computed for {def.label} yet. Each conference below links to its player
            rankings.
          </p>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {fallback.map((c) => (
              <li key={c.conference_code} className="flex items-baseline justify-between gap-3 border-b border-slate-800 py-2 text-sm">
                <Link href={`/dashboard/sports/${code}/conferences/${c.conference_code}`} className="text-slate-200 hover:text-white">
                  {formatConferenceDisplayName(c.conference, c.conference_code)}
                </Link>
                {typeof c.ranked_count === "number" && (
                  <span className="num shrink-0 text-xs text-slate-500">{c.ranked_count} ranked</span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState title={`No conference data for ${def.label} yet.`} />
      )}
    </div>
  );
}
