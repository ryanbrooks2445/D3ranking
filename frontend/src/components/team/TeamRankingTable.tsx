import Link from "next/link";
import type { TeamRow } from "@/lib/teams";
import { conferenceShortName, formatPct, formatPerGame, formatRankChange, formatRating, formatRecord, formatInt } from "@/lib/format";
import { DataTable, type DataColumn, type SortLinkConfig } from "@/components/ui/DataTable";

/**
 * National team rankings. Columns for data the pipeline does not yet have
 * (record, rank movement) appear automatically once any row carries a value.
 */
export function TeamRankingTable({
  rows,
  sportCode,
  sort,
  compact = false,
  showConference = true,
}: {
  rows: TeamRow[];
  sportCode: string;
  sort?: SortLinkConfig;
  compact?: boolean;
  showConference?: boolean;
}) {
  const hasRecords = rows.some((t) => t.seasonStat?.wins != null && t.seasonStat?.losses != null);
  const hasHistory = rows.some(
    (t) => t.seasonStat?.previousNationalRank != null && t.seasonStat.previousNationalRank !== t.seasonStat.nationalRank,
  );
  const hasShooting = rows.some((t) => t.seasonStat?.fieldGoalPct != null);

  const columns: DataColumn<TeamRow>[] = [
    {
      key: "rank",
      label: "Rk",
      numeric: true,
      sortable: true,
      defaultDir: "asc",
      render: (t) => (
        <span className={t.seasonStat?.nationalRank == null ? "text-slate-600" : "font-semibold"}>
          {t.seasonStat?.nationalRank ?? "NR"}
        </span>
      ),
    },
    ...(hasHistory
      ? [
          {
            key: "change",
            label: "Chg",
            numeric: true,
            render: (t: TeamRow) => {
              const c = formatRankChange(t.seasonStat?.nationalRank, t.seasonStat?.previousNationalRank);
              return <span className={c?.startsWith("+") ? "text-emerald-400" : c?.startsWith("-") ? "text-red-400" : "text-slate-500"}>{c ?? "—"}</span>;
            },
          },
        ]
      : []),
    {
      key: "team",
      label: "Team",
      sortable: true,
      defaultDir: "asc",
      render: (t) => (
        <Link href={`/teams/${sportCode}/${t.slug}`} className="font-semibold text-white">
          {t.name}
        </Link>
      ),
    },
    ...(showConference
      ? [
          {
            key: "conference",
            label: "Conference",
            abbr: "Conf",
            sortable: true,
            defaultDir: "asc" as const,
            render: (t: TeamRow) =>
              t.conference ? (
                <Link href={`/conferences/${sportCode}/${t.conference.code}`} className="text-slate-300">
                  {conferenceShortName(t.conference.name, t.conference.code)}
                </Link>
              ) : (
                "—"
              ),
          },
        ]
      : []),
    ...(hasRecords
      ? [{ key: "record", label: "Record", numeric: true, render: (t: TeamRow) => formatRecord(t.seasonStat?.wins, t.seasonStat?.losses) }]
      : []),
    {
      key: "rating",
      label: "Rating",
      title: "D3Rank team rating: roster strength scaled to mean 50, SD 10",
      numeric: true,
      sortable: true,
      render: (t) => <span className="font-semibold text-white">{formatRating(t.seasonStat?.rating)}</span>,
    },
    { key: "ppg", label: "PPG", numeric: true, sortable: true, hideBelow: compact ? "md" : "sm", render: (t) => formatPerGame(t.seasonStat?.pointsPerGame) },
    ...(compact
      ? []
      : [
          ...(hasShooting
            ? [
                { key: "fg", label: "FG%", numeric: true, sortable: true, hideBelow: "md" as const, render: (t: TeamRow) => formatPct(t.seasonStat?.fieldGoalPct) },
                { key: "tp", label: "3P%", numeric: true, sortable: true, hideBelow: "lg" as const, render: (t: TeamRow) => formatPct(t.seasonStat?.threePointPct) },
                { key: "ft", label: "FT%", numeric: true, sortable: true, hideBelow: "lg" as const, render: (t: TeamRow) => formatPct(t.seasonStat?.freeThrowPct) },
              ]
            : []),
          { key: "rpg", label: "RPG", numeric: true, sortable: true, hideBelow: "lg" as const, render: (t: TeamRow) => formatPerGame(t.seasonStat?.reboundsPerGame) },
          { key: "apg", label: "APG", numeric: true, sortable: true, hideBelow: "lg" as const, render: (t: TeamRow) => formatPerGame(t.seasonStat?.assistsPerGame) },
          { key: "gp", label: "GP", numeric: true, sortable: true, hideBelow: "md" as const, render: (t: TeamRow) => formatInt(t.seasonStat?.gamesPlayed) },
          {
            key: "ranked",
            label: "Ranked players",
            abbr: "Rkd",
            title: "Players meeting the minimum games and minutes thresholds",
            numeric: true,
            sortable: true,
            hideBelow: "md" as const,
            render: (t: TeamRow) => formatInt(t.seasonStat?.rankedPlayerCount),
          },
        ]),
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(t) => t.id}
      sort={sort}
      compact={compact}
      emptyMessage="No teams match these filters."
      caption="National team rankings"
    />
  );
}
