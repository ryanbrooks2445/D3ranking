import Link from "next/link";
import type { TeamRow } from "@/lib/teams";
import { formatPct, formatPerGame, formatRank, formatRating, formatRecord, formatInt } from "@/lib/format";
import { DataTable, type DataColumn, type SortLinkConfig } from "@/components/ui/DataTable";

/**
 * Conference standings ordered by D3Rank rating. Record columns render only when
 * at least one team has a record in the database, so the table never shows a
 * column of dashes for data the pipeline does not have yet.
 */
export function ConferenceStandingsTable({
  teams,
  sportCode,
  highlightTeamId,
  sort,
  compact = false,
}: {
  teams: TeamRow[];
  sportCode: string;
  highlightTeamId?: string;
  sort?: SortLinkConfig;
  compact?: boolean;
}) {
  const hasRecords = teams.some((t) => t.seasonStat?.wins != null && t.seasonStat?.losses != null);
  const hasConfRecords = teams.some((t) => t.seasonStat?.conferenceWins != null && t.seasonStat?.conferenceLosses != null);
  const hasShooting = !compact && teams.some((t) => t.seasonStat?.fieldGoalPct != null);

  const columns: DataColumn<TeamRow>[] = [
    {
      key: "confRank",
      label: "Rk",
      numeric: true,
      sortable: true,
      defaultDir: "asc",
      render: (t) => (
        <span className={t.seasonStat?.conferenceRank == null ? "text-slate-600" : "font-semibold"}>
          {t.seasonStat?.conferenceRank ?? "—"}
        </span>
      ),
    },
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
    ...(hasRecords
      ? [{ key: "record", label: "Overall", numeric: true, render: (t: TeamRow) => formatRecord(t.seasonStat?.wins, t.seasonStat?.losses) }]
      : []),
    ...(hasConfRecords
      ? [{ key: "confRecord", label: "Conf", numeric: true, render: (t: TeamRow) => formatRecord(t.seasonStat?.conferenceWins, t.seasonStat?.conferenceLosses) }]
      : []),
    {
      key: "rating",
      label: "Rating",
      title: "D3Rank team rating (roster strength, mean 50)",
      numeric: true,
      sortable: true,
      render: (t) => <span className="font-semibold text-white">{formatRating(t.seasonStat?.rating)}</span>,
    },
    {
      key: "nationalRank",
      label: "Natl rank",
      abbr: "Natl",
      numeric: true,
      sortable: true,
      defaultDir: "asc",
      render: (t) => (
        <span className={t.seasonStat?.nationalRank == null ? "text-slate-600" : undefined}>
          {formatRank(t.seasonStat?.nationalRank)}
        </span>
      ),
    },
    ...(compact
      ? []
      : [{ key: "ppg", label: "PPG", numeric: true, sortable: true, hideBelow: "sm" as const, render: (t: TeamRow) => formatPerGame(t.seasonStat?.pointsPerGame) }]),
    ...(hasShooting
      ? [
          { key: "fg", label: "FG%", numeric: true, sortable: true, hideBelow: "md" as const, render: (t: TeamRow) => formatPct(t.seasonStat?.fieldGoalPct) },
          { key: "tp", label: "3P%", numeric: true, sortable: true, hideBelow: "lg" as const, render: (t: TeamRow) => formatPct(t.seasonStat?.threePointPct) },
        ]
      : []),
    ...(compact
      ? []
      : [
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
      rows={teams}
      rowKey={(t) => t.id}
      sort={sort}
      compact={compact}
      highlightRow={highlightTeamId ? (t) => t.id === highlightTeamId : undefined}
      emptyMessage="No teams found for this conference."
      caption="Conference standings by D3Rank rating"
    />
  );
}
