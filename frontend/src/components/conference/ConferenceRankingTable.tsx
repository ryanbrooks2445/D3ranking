import Link from "next/link";
import type { ConferenceSeasonRow } from "@/lib/conferenceSeasons";
import { conferenceShortName, formatRankChange, formatRating, formatInt } from "@/lib/format";
import { DataTable, type DataColumn, type SortLinkConfig } from "@/components/ui/DataTable";

export function ConferenceRankingTable({
  rows,
  sportCode,
  sort,
  compact = false,
}: {
  rows: ConferenceSeasonRow[];
  sportCode: string;
  sort?: SortLinkConfig;
  compact?: boolean;
}) {
  const hasHistory = rows.some((r) => r.previousNationalRank != null && r.previousNationalRank !== r.nationalRank);

  const columns: DataColumn<ConferenceSeasonRow>[] = [
    {
      key: "rank",
      label: "Rk",
      numeric: true,
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <span className={r.nationalRank == null ? "text-slate-600" : "font-semibold"}>{r.nationalRank ?? "—"}</span>
      ),
    },
    ...(hasHistory
      ? [
          {
            key: "change",
            label: "Chg",
            numeric: true,
            render: (r: ConferenceSeasonRow) => {
              const c = formatRankChange(r.nationalRank, r.previousNationalRank);
              return <span className={c?.startsWith("+") ? "text-emerald-400" : c?.startsWith("-") ? "text-red-400" : "text-slate-500"}>{c ?? "—"}</span>;
            },
          },
        ]
      : []),
    {
      key: "conference",
      label: "Conference",
      sortable: true,
      defaultDir: "asc",
      render: (r) => (
        <Link href={`/conferences/${sportCode}/${r.conference.code}`} className="font-semibold text-white" title={r.displayName}>
          {compact ? (
            conferenceShortName(r.conference.name, r.conference.code)
          ) : (
            <>
              <span className="md:hidden">{conferenceShortName(r.conference.name, r.conference.code)}</span>
              <span className="hidden md:inline">{r.displayName}</span>
            </>
          )}
        </Link>
      ),
    },
    { key: "teams", label: "Teams", numeric: true, sortable: true, hideBelow: compact ? "lg" : undefined, render: (r) => formatInt(r.teamCount) },
    {
      key: "rating",
      label: "Rating",
      title: "0.6 × average team rating + 0.4 × top-3 average",
      numeric: true,
      sortable: true,
      render: (r) => <span className="font-semibold text-white">{formatRating(r.rating)}</span>,
    },
    ...(compact
      ? []
      : [
          { key: "avg", label: "Avg team", abbr: "Avg", numeric: true, sortable: true, hideBelow: "sm" as const, render: (r: ConferenceSeasonRow) => formatRating(r.avgTeamRating) },
          { key: "median", label: "Median", numeric: true, sortable: true, hideBelow: "lg" as const, render: (r: ConferenceSeasonRow) => formatRating(r.medianTeamRating) },
          { key: "top3", label: "Top-3 avg", abbr: "Top 3", numeric: true, sortable: true, hideBelow: "md" as const, render: (r: ConferenceSeasonRow) => formatRating(r.top3AvgRating) },
          { key: "top", label: "Best team", abbr: "Best", numeric: true, sortable: true, hideBelow: "lg" as const, render: (r: ConferenceSeasonRow) => formatRating(r.topTeamRating) },
        ]),
    {
      key: "top25",
      label: "Top-25 teams",
      abbr: "T25",
      numeric: true,
      sortable: true,
      hideBelow: compact ? "sm" : undefined,
      render: (r) => <span className={r.teamsInTop25 ? "text-white" : "text-slate-500"}>{formatInt(r.teamsInTop25)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      compact={compact}
      emptyMessage="Conference ratings have not been computed for this sport."
      caption="National conference rankings"
    />
  );
}
