export type StatItem = { label: string; value: string; hint?: string };

/**
 * Key figures as a ruled, tabular list (not a grid of cards). Rows with an
 * em-dash value are still shown when `showUnavailable` so the absence is explicit.
 */
export function StatList({
  items,
  columns = 2,
  showUnavailable = true,
}: {
  items: StatItem[];
  columns?: 1 | 2 | 3;
  showUnavailable?: boolean;
}) {
  const visible = showUnavailable ? items : items.filter((i) => i.value !== "—");
  if (visible.length === 0) return null;
  const grid = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <dl className={`grid grid-cols-1 gap-x-8 ${grid}`}>
      {visible.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-slate-800 py-2 text-sm"
        >
          <dt className="text-slate-400">
            {item.label}
            {item.hint && <span className="ml-1 text-xs text-slate-600">{item.hint}</span>}
          </dt>
          <dd className={`num font-semibold ${item.value === "—" ? "text-slate-600" : "text-white"}`}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
