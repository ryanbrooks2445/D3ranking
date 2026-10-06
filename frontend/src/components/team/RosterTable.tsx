import Link from "next/link";
import type { RosterRow } from "@/lib/teams";
import { formatPerGame, formatInt, formatRank, EM_DASH } from "@/lib/format";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";

function stat(row: RosterRow, key: string): number | null {
  const v = (row.stats as Record<string, unknown> | null)?.[key];
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

function meta(row: RosterRow, key: string): number | null {
  const v = (row.eligibilityMeta as Record<string, unknown> | null)?.[key] ?? stat(row, key);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

const BASKETBALL_STATS: { key: string; label: string }[] = [
  { key: "points_per_game", label: "PPG" },
  { key: "rebounds_per_game", label: "RPG" },
  { key: "assists_per_game", label: "APG" },
  { key: "steals_per_game", label: "SPG" },
  { key: "blocked_shots_per_game", label: "BPG" },
];

export function RosterTable({
  roster,
  sportCode,
  showRatings,
}: {
  roster: RosterRow[];
  sportCode: string;
  showRatings: boolean;
}) {
  const isBasketball = sportCode === "mbb" || sportCode === "wbb";

  const columns: DataColumn<RosterRow>[] = [
    ...(showRatings
      ? [
          {
            key: "rank",
            label: "Natl rank",
            abbr: "Rk",
            numeric: true,
            render: (r: RosterRow) => (
              <span className={r.globalRank == null ? "text-slate-600" : "font-semibold"}>{formatRank(r.globalRank)}</span>
            ),
          },
        ]
      : []),
    {
      key: "player",
      label: "Player",
      render: (r) => (
        <Link href={`/athletes/${r.athlete.slug}`} className="font-semibold text-white">
          {r.athlete.displayName}
        </Link>
      ),
    },
    { key: "pos", label: "Pos", render: (r) => r.position || EM_DASH },
    { key: "class", label: "Class", hideBelow: "md", render: (r) => (r.classYear && r.classYear !== "0" ? r.classYear : EM_DASH) },
    { key: "gp", label: "GP", numeric: true, hideBelow: "sm", render: (r) => formatInt(meta(r, "gp")) },
    ...(isBasketball
      ? [
          { key: "mpg", label: "MPG", numeric: true, hideBelow: "md" as const, render: (r: RosterRow) => formatPerGame(meta(r, "mpg")) },
          ...BASKETBALL_STATS.map((s) => ({
            key: s.key,
            label: s.label,
            numeric: true,
            hideBelow: s.key === "steals_per_game" || s.key === "blocked_shots_per_game" ? ("lg" as const) : undefined,
            render: (r: RosterRow) => formatPerGame(stat(r, s.key)),
          })),
        ]
      : []),
    ...(showRatings
      ? [
          {
            key: "ovr",
            label: "OVR",
            numeric: true,
            render: (r: RosterRow) => (
              <span className={r.rating == null ? "text-slate-600" : "font-semibold text-white"}>{r.rating ?? EM_DASH}</span>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      rows={roster}
      rowKey={(r) => r.id}
      stickyFirstColumn={!showRatings}
      emptyMessage="No ranked players on this roster yet."
      caption="Team roster with season averages"
    />
  );
}
