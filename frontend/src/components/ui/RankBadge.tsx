import { formatRank } from "@/lib/format";

/** Inline rank: "#12" in a fixed-width numeric cell; "NR" when unranked. */
export function RankBadge({ rank, className = "" }: { rank: number | null | undefined; className?: string }) {
  const ranked = rank != null;
  return (
    <span
      className={`num inline-block min-w-[2.5rem] font-semibold ${ranked ? "text-white" : "text-slate-600"} ${className}`}
      title={ranked ? undefined : "Not ranked: below minimum ranked players or games played"}
    >
      {formatRank(rank)}
    </span>
  );
}

/** Rating pill with no color tiers — the number carries the meaning. */
export function RatingCell({ value }: { value: number | null | undefined }) {
  return (
    <span className={`num font-semibold ${value == null ? "text-slate-600" : "text-white"}`}>
      {value == null ? "—" : value.toFixed(1)}
    </span>
  );
}
