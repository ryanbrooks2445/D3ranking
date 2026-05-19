export function OvrBadge({ rating }: { rating: number | null | undefined }) {
  if (rating == null || rating < 60) return null;
  let classes =
    "inline-flex items-center justify-center rounded-lg px-3 py-1 text-2xl font-black tabular-nums ring-2 ";
  if (rating >= 99) classes += "bg-amber-400/20 text-amber-400 ring-amber-400/50";
  else if (rating >= 94) classes += "bg-violet-500/20 text-violet-400 ring-violet-500/40";
  else if (rating >= 90) classes += "bg-emerald-500/20 text-emerald-400 ring-emerald-500/40";
  else if (rating >= 80) classes += "bg-blue-500/20 text-blue-400 ring-blue-500/40";
  else if (rating >= 70) classes += "bg-teal-500/20 text-teal-400 ring-teal-500/40";
  else classes += "bg-slate-500/20 text-slate-300 ring-slate-500/40";

  return <span className={classes}>{rating}</span>;
}
