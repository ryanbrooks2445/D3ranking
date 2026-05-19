import { getSport, getSportSegmentColumns } from "@/lib/sports";

const SKIP_KEYS = new Set([
  "global_rank",
  "rank",
  "player_name",
  "team",
  "position",
  "conference",
  "conference_code",
  "rating",
  "composite_score",
  "season",
  "sport",
]);

function formatCell(key: string, val: unknown, pct?: boolean): string {
  if (val == null || val === "") return "—";
  const n = typeof val === "number" ? val : Number(val);
  if (pct && Number.isFinite(n)) return `${(n * 100).toFixed(1)}%`;
  if (Number.isFinite(n)) {
    if (key.includes("average") || key.includes("pct") || key.includes("percentage")) {
      return n.toFixed(3).replace(/^0/, "");
    }
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  return String(val);
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}

export function AthleteStatGrid({
  sportCode,
  stats,
  segment,
}: {
  sportCode: string;
  stats: Record<string, unknown>;
  segment?: string;
}) {
  const def = getSport(sportCode);
  const cols = def ? getSportSegmentColumns(def, segment ?? "") : [];
  const fromConfig = cols.filter((c) => !SKIP_KEYS.has(c.key) && stats[c.key] != null);

  const entries =
    fromConfig.length > 0
      ? fromConfig.map((c) => ({ label: c.label, value: formatCell(c.key, stats[c.key], c.pct) }))
      : Object.entries(stats)
          .filter(([k, v]) => !SKIP_KEYS.has(k) && v != null && v !== "" && v !== 0)
          .slice(0, 16)
          .map(([k, v]) => ({ label: k.replace(/_/g, " "), value: formatCell(k, v) }));

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No stat line available.</p>;
  }

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((e) => (
        <StatBlock key={e.label} label={e.label} value={e.value} />
      ))}
    </dl>
  );
}
