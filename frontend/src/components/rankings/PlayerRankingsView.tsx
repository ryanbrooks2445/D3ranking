import { readDataFileSafe, getSeasonDisplay, getDataQualityNote, getSportRankingsJsonPath } from "@/lib/data";
import { getSport, getSportSegmentColumns, filterRowsBySegment, isSportUnderConstruction } from "@/lib/sports";
import { isPro } from "@/lib/auth";
import { FREE_GLOBAL_LIMIT } from "@/lib/paywall";
import { getProfileSlugMapForSport, slugMapToRecord } from "@/lib/athletes";
import { SportPlayerRankingsTable } from "@/components/SportPlayerRankingsTable";
import { SegmentTabs } from "@/components/SegmentTabs";
import { CompositeScoreExplainer } from "@/components/CompositeScoreExplainer";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Crumb } from "@/components/ui/Breadcrumbs";

const PROFILE_SPORTS = new Set(["mbb", "baseball"]);

/** Default segment when a sport is segmented and none is selected. */
export function defaultSegmentFor(sportCode: string): string {
  if (sportCode === "baseball") return "batting";
  if (sportCode === "football") return "qb";
  return "";
}

export async function loadGlobalRankingRows(sportCode: string): Promise<Record<string, unknown>[]> {
  const rankingsPath = await getSportRankingsJsonPath(sportCode);
  const raw = await readDataFileSafe(rankingsPath);
  let rows: Record<string, unknown>[] = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];

  // Legacy MBB export location, kept so an older data repo still renders.
  if (rows.length === 0 && sportCode === "mbb") {
    const legacyRaw = await readDataFileSafe("d3_mbb_player_rankings_2025_26.json");
    if (legacyRaw) {
      rows = (JSON.parse(legacyRaw) as Record<string, unknown>[]).map((r) => ({
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
  rows.sort((a, b) => (Number(a.global_rank) || 0) - (Number(b.global_rank) || 0));
  return rows;
}

/**
 * National player rankings for one sport, driven by the exported rankings JSON.
 * Shared by /rankings/players/[sport] and the legacy /dashboard/sports/[sport]/global route.
 */
export async function PlayerRankingsView({
  sportCode,
  segmentParam,
  basePath,
  crumbs,
  sportSwitcher,
}: {
  sportCode: string;
  segmentParam?: string;
  basePath: string;
  crumbs: Crumb[];
  sportSwitcher?: React.ReactNode;
}) {
  const code = sportCode.toLowerCase();
  const def = getSport(code);
  const sportLabel = def?.label ?? code.toUpperCase();
  const { seasonLabel, note: seasonNote } = await getSeasonDisplay(code);

  if (isSportUnderConstruction(code)) {
    return (
      <div className="space-y-6">
        <PageHeader crumbs={crumbs} eyebrow="National player rankings" title={`Division III ${sportLabel} Player Rankings`} />
        {sportSwitcher}
        <UnderConstructionBanner sportLabel={sportLabel} />
      </div>
    );
  }

  const [pro, rows] = await Promise.all([isPro(), loadGlobalRankingRows(code)]);

  const segmentId =
    segmentParam && def?.segments?.some((s) => s.id === segmentParam) ? segmentParam : defaultSegmentFor(code);
  const filteredRows = segmentId ? filterRowsBySegment(code, segmentId, rows) : rows;
  const segmentRows = filteredRows.map((r, i) => ({ ...r, global_rank: i + 1, rank: i + 1 }));

  const columns = getSportSegmentColumns(def ?? undefined, segmentId).map((c) => ({ key: c.key, label: c.label, pct: c.pct }));
  if (columns.length === 0) {
    columns.push(
      { key: "global_rank", label: "Rank", pct: false },
      { key: "player_name", label: "Player", pct: false },
      { key: "team", label: "Team", pct: false },
      { key: "rating", label: "OVR", pct: false },
    );
  }

  let profileSlugLookup: Record<string, string> | undefined;
  if (PROFILE_SPORTS.has(code)) {
    try {
      profileSlugLookup = slugMapToRecord(await getProfileSlugMapForSport(code));
    } catch {
      profileSlugLookup = undefined;
    }
  }

  const dataQualityNote = getDataQualityNote(code);
  const segments = def?.segments ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={crumbs}
        eyebrow="National player rankings"
        title={`Division III ${sportLabel} Player Rankings`}
        meta={
          <>
            {segmentRows.length.toLocaleString()} ranked players · {seasonLabel}
            {!pro && <> · top {FREE_GLOBAL_LIMIT} free</>}
            {seasonNote && <span className="block text-amber-400/90">{seasonNote}</span>}
            {dataQualityNote && <span className="block text-slate-500">{dataQualityNote}</span>}
          </>
        }
      />
      {sportSwitcher}
      {segments.length > 0 && <SegmentTabs sportCode={code} segments={segments} currentSegmentId={segmentId} baseHref={basePath} />}
      <CompositeScoreExplainer sportCode={code} />
      <SportPlayerRankingsTable
        rows={segmentRows}
        columns={columns}
        isPro={pro}
        freeRowLimit={FREE_GLOBAL_LIMIT}
        profileSlugLookup={profileSlugLookup}
        sportCode={code}
        segmentId={segmentId || undefined}
      />
    </div>
  );
}
