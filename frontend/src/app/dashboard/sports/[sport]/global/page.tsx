import { readDataFileSafe, getSeasonDisplay, getDataQualityNote } from "@/lib/data";
import Link from "next/link";
import { getSport, getSportSegmentColumns, filterRowsBySegment } from "@/lib/sports";
import { isPro } from "@/lib/auth";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";
import { SegmentTabs } from "@/components/SegmentTabs";
import { CompositeScoreExplainer } from "@/components/CompositeScoreExplainer";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  const def = getSport(sport.toLowerCase());
  const label = def?.label ?? sport.toUpperCase();
  return {
    title: `Global rankings — ${label} | D3 Rankings`,
  };
}

export default async function GlobalRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ segment?: string }>;
}) {
  const { sport } = await params;
  const { segment: segmentParam } = await searchParams;
  const code = sport.toLowerCase();
  const def = getSport(code);
  const pro = await isPro();

  let rows: Record<string, unknown>[] = [];
  const rankingsPath = `sports/${code}/rankings_2025-26.json`;
  let raw = await readDataFileSafe(rankingsPath);
  if (raw) {
    rows = JSON.parse(raw) as Record<string, unknown>[];
  }

  // Fallback: MBB used to be served from d3_mbb_player_rankings_2025_26.json (e.g. if data repo has old structure)
  if (rows.length === 0 && code === "mbb") {
    const legacyRaw = await readDataFileSafe("d3_mbb_player_rankings_2025_26.json");
    if (legacyRaw) {
      const d3Rows = JSON.parse(legacyRaw) as Record<string, unknown>[];
      rows = d3Rows.map((r) => ({
        ...r,
        points_per_game: r.ppg,
        rebounds_per_game: r.rpg,
        assists_per_game: r.apg,
        turnovers_per_game: r.tov_pg,
        steals_per_game: r.spg,
        blocked_shots_per_game: r.bpg,
        rating: r.rating ?? null,
      }));
    }
  }

  rows.sort(
    (a, b) => (Number(a.global_rank) ?? 0) - (Number(b.global_rank) ?? 0),
  );

  const segmentId = segmentParam && def?.segments?.some((s) => s.id === segmentParam) ? segmentParam : "";
  const filteredRows = segmentId
    ? filterRowsBySegment(code, segmentId, rows)
    : rows;
  const segmentRows = filteredRows.map((r, i) => ({
    ...r,
    global_rank: i + 1,
    rank: i + 1,
  }));

  const sportLabel = def?.label ?? code.toUpperCase();
  const columns = getSportSegmentColumns(def ?? undefined, segmentId).map((c) => ({
    key: c.key,
    label: c.label,
    pct: c.pct,
  }));
  if (columns.length === 0) {
    columns.push(
      { key: "global_rank", label: "Rank", pct: false },
      { key: "player_name", label: "Player", pct: false },
      { key: "team", label: "Team", pct: false },
      { key: "rating", label: "OVR", pct: false },
    );
  }

  const segments = def?.segments ?? [];
  const { seasonLabel, note: seasonNote } = await getSeasonDisplay(code);
  const dataQualityNote = getDataQualityNote(code);

  return (
    <div className="space-y-8">
      <header>
        <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-slate-300 transition">
            Player Rankings
          </Link>
          <span className="text-slate-600" aria-hidden>›</span>
          <Link
            href={`/dashboard/sports/${code}`}
            className="hover:text-slate-300 transition"
          >
            {sportLabel}
          </Link>
          <span className="text-slate-600" aria-hidden>›</span>
          <span className="font-semibold text-slate-300">Global</span>
        </nav>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Global rankings — {sportLabel}
        </h1>
        <p className="mt-2 text-slate-400">
          All D3 players · {seasonLabel} · Top 25 free; full list with Pro
        </p>
        {seasonNote && (
          <p className="mt-1 text-sm text-amber-400/90">
            {seasonNote}
          </p>
        )}
        {dataQualityNote && (
          <p className="mt-1 text-sm text-slate-500 max-w-xl">
            {dataQualityNote}
          </p>
        )}
      </header>

      {segments.length > 0 && (
        <SegmentTabs
          sportCode={code}
          segments={segments}
          currentSegmentId={segmentId}
        />
      )}

      <CompositeScoreExplainer sportCode={code} />

      <SportPlayerRankingsTable
        rows={segmentRows}
        columns={columns}
        isPro={pro}
        freeRowLimit={25}
      />
    </div>
  );
}
