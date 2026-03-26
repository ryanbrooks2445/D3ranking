import { readDataFileSafe, getSeasonDisplay, getDataQualityNote } from "@/lib/data";
import Link from "next/link";
import { getSport, getSportSegmentColumns, filterRowsBySegment, isSportUnderConstruction } from "@/lib/sports";
import { isPro } from "@/lib/auth";
import { formatConferenceDisplayName } from "@/lib/conferences";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";
import { SegmentTabs } from "@/components/SegmentTabs";
import { CompositeScoreExplainer } from "@/components/CompositeScoreExplainer";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string; conf: string }>;
}): Promise<Metadata> {
  const { sport, conf } = await params;
  const def = getSport(sport.toLowerCase());
  const sportLabel = def?.label ?? sport.toUpperCase();
  const confPath = `sports/${sport.toLowerCase()}/conferences/${conf.toLowerCase()}.json`;
  let conferenceName = conf;
  try {
    const raw = await readDataFileSafe(confPath);
    if (raw) {
      const rows = JSON.parse(raw) as Record<string, unknown>[];
      conferenceName = formatConferenceDisplayName(
        (rows[0] as Record<string, unknown>)?.conference as string | undefined ?? "",
        conf.toLowerCase(),
      );
    }
  } catch {
    // use conf code
  }
  return {
    title: `${conferenceName} — ${sportLabel} | D3 Rankings`,
  };
}

export default async function ConferenceRankingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; conf: string }>;
  searchParams: Promise<{ segment?: string }>;
}) {
  const { sport, conf } = await params;
  const { segment: segmentParam } = await searchParams;
  const code = sport.toLowerCase();
  const confCode = conf.toLowerCase();
  const def = getSport(code);
  const pro = await isPro();

  if (isSportUnderConstruction(code)) {
    const sportLabel = def?.label ?? code.toUpperCase();
    const conferenceName = formatConferenceDisplayName("", confCode);
    return (
      <div className="space-y-8">
        <header>
          <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/dashboard" className="hover:text-slate-300 transition">
              Player Rankings
            </Link>
            <span className="text-slate-600" aria-hidden>›</span>
            <Link href={`/dashboard/sports/${code}`} className="hover:text-slate-300 transition">
              {sportLabel}
            </Link>
            <span className="text-slate-600" aria-hidden>›</span>
            <span className="font-semibold text-slate-300">{conferenceName || confCode}</span>
          </nav>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {conferenceName || confCode}
          </h1>
        </header>
        <UnderConstructionBanner sportLabel={sportLabel} />
      </div>
    );
  }

  const confPath = `sports/${code}/conferences/${confCode}.json`;

  let rows: Record<string, unknown>[] = [];
  try {
    const raw = await readDataFileSafe(confPath);
    if (raw) {
      rows = JSON.parse(raw) as Record<string, unknown>[];
    }
  } catch {
    rows = [];
  }

  // Sort by rank so conference rankings display in correct order (e.g. hockey)
  if (rows.length > 0) {
    const first = rows[0] as Record<string, unknown>;
    const rankKey = first.global_rank != null ? "global_rank" : first.rank != null ? "rank" : null;
    if (rankKey) {
      rows = [...rows].sort(
        (a, b) =>
          Number((a as Record<string, unknown>)[rankKey]) -
          Number((b as Record<string, unknown>)[rankKey]),
      );
    }
  }

  const segmentId =
    segmentParam && def?.segments?.some((s) => s.id === segmentParam)
      ? segmentParam
      : code === "baseball"
        ? "batting"
        : "";
  const filteredRows = segmentId
    ? filterRowsBySegment(code, segmentId, rows)
    : rows;
  const segmentRows = filteredRows.map((r, i) => ({
    ...r,
    rank: i + 1,
    global_rank: i + 1,
  }));

  const conferenceName = formatConferenceDisplayName(
    (rows[0] as Record<string, unknown>)?.conference as string | undefined ?? "",
    confCode,
  );
  const sportLabel = def?.label ?? code.toUpperCase();

  const segmentColumns = getSportSegmentColumns(def ?? undefined, segmentId);
  const columns = segmentColumns.map((c) => ({
    key: c.key === "global_rank" ? "rank" : c.key,
    label: c.label,
    pct: c.pct,
  }));
  if (columns.length === 0) {
    columns.push(
      { key: "rank", label: "Rank", pct: false },
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
          <span className="font-semibold text-slate-300">{conferenceName}</span>
        </nav>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {conferenceName}
        </h1>
        <p className="mt-2 text-slate-400">
          {sportLabel} · {seasonLabel} · Top 5 free; full list with Pro
        </p>
        {seasonNote && (
          <p className="mt-1 text-sm text-amber-400/90">{seasonNote}</p>
        )}
        {dataQualityNote && (
          <p className="mt-1 text-sm text-slate-500 max-w-xl">{dataQualityNote}</p>
        )}
      </header>

      {segments.length > 0 && (
        <SegmentTabs
          sportCode={code}
          segments={segments}
          currentSegmentId={segmentId}
          baseHref={`/dashboard/sports/${code}/conferences/${confCode}`}
        />
      )}

      <CompositeScoreExplainer sportCode={code} />

      <SportPlayerRankingsTable
        rows={segmentRows}
        columns={columns}
        isPro={pro}
        freeRowLimit={5}
        title={`${sportLabel} · ${conferenceName}`}
      />
    </div>
  );
}
