import Link from "next/link";
import { type PlayerSeasonRow, statValue } from "@/lib/players";
import { conferenceShortName, formatPerGame, formatRank, EM_DASH } from "@/lib/format";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";

/**
 * Ranked player list backed by the database (used on conference pages, the
 * rankings hub, and the homepage). Rank/OVR are hidden for free users to match
 * the existing player-rankings paywall.
 */
export function TopPlayersTable({
  rows,
  sportCode,
  showRatings,
  showConference = false,
  compact = false,
}: {
  rows: PlayerSeasonRow[];
  sportCode: string;
  showRatings: boolean;
  showConference?: boolean;
  compact?: boolean;
}) {
  const isBasketball = sportCode === "mbb" || sportCode === "wbb";

  const columns: DataColumn<PlayerSeasonRow>[] = [
    {
      key: "rank",
      label: "Rk",
      numeric: true,
      render: (r, i) => <span className="font-semibold">{showRatings ? formatRank(r.globalRank) : i + 1}</span>,
    },
    {
      key: "player",
      label: "Player",
      render: (r) => (
        <Link href={`/athletes/${r.athlete.slug}`} className="font-semibold text-white">
          {r.athlete.displayName}
        </Link>
      ),
    },
    { key: "pos", label: "Pos", hideBelow: "sm", render: (r) => r.position || EM_DASH },
    {
      key: "team",
      label: "Team",
      render: (r) =>
        r.team ? (
          <Link href={`/teams/${sportCode}/${r.team.slug}`} className="text-slate-300">
            {r.team.name}
          </Link>
        ) : (
          EM_DASH
        ),
    },
    ...(showConference
      ? [
          {
            key: "conf",
            label: "Conf",
            hideBelow: "md" as const,
            render: (r: PlayerSeasonRow) =>
              r.conference ? (
                <Link href={`/conferences/${sportCode}/${r.conference.code}`} className="text-slate-400">
                  {conferenceShortName(r.conference.name, r.conference.code)}
                </Link>
              ) : (
                EM_DASH
              ),
          },
        ]
      : []),
    ...(isBasketball
      ? [
          { key: "ppg", label: "PPG", numeric: true, render: (r: PlayerSeasonRow) => formatPerGame(statValue(r, "points_per_game")) },
          { key: "rpg", label: "RPG", numeric: true, hideBelow: compact ? ("sm" as const) : undefined, render: (r: PlayerSeasonRow) => formatPerGame(statValue(r, "rebounds_per_game")) },
          { key: "apg", label: "APG", numeric: true, hideBelow: compact ? ("sm" as const) : undefined, render: (r: PlayerSeasonRow) => formatPerGame(statValue(r, "assists_per_game")) },
        ]
      : []),
    ...(showRatings
      ? [
          {
            key: "ovr",
            label: "OVR",
            numeric: true,
            render: (r: PlayerSeasonRow) => <span className="font-semibold text-white">{r.rating ?? EM_DASH}</span>,
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      compact={compact}
      emptyMessage="No ranked players."
      caption="Top ranked players"
    />
  );
}
