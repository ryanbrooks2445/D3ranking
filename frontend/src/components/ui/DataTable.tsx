import Link from "next/link";
import type { ReactNode } from "react";
import { nextSort, sortHref, type SortDir, type SortState } from "@/lib/tableSort";

export type DataColumn<T> = {
  key: string;
  label: string;
  /** Short header used below the `md` breakpoint when provided. */
  abbr?: string;
  /** Right-align + tabular numerals. */
  numeric?: boolean;
  sortable?: boolean;
  defaultDir?: SortDir;
  /** Drop the column below this breakpoint (priority columns stay). */
  hideBelow?: "sm" | "md" | "lg";
  title?: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
};

const HIDE_CLASS: Record<NonNullable<DataColumn<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export type SortLinkConfig = {
  basePath: string;
  params: Record<string, string | undefined>;
  current: SortState;
};

/**
 * Server-rendered data table. Sorting is link-based (?sort=&dir=) so pages stay
 * server components and sort state is shareable in the URL. Horizontal scroll on
 * narrow screens; low-priority columns are hidden via `hideBelow`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  compact = false,
  stickyFirstColumn = false,
  emptyMessage = "No data available.",
  highlightRow,
  caption,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  sort?: SortLinkConfig;
  compact?: boolean;
  stickyFirstColumn?: boolean;
  emptyMessage?: string;
  highlightRow?: (row: T) => boolean;
  caption?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-800">
      <table className={`data-table ${compact ? "compact" : ""}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col, ci) => {
              const hide = col.hideBelow ? HIDE_CLASS[col.hideBelow] : "";
              const sticky = stickyFirstColumn && ci === 0 ? "sticky left-0 z-10" : "";
              const isActive = sort?.current.key === col.key;
              const ariaSort = isActive ? (sort?.current.dir === "asc" ? "ascending" : "descending") : undefined;
              const header = (
                <>
                  {col.abbr ? (
                    <>
                      <span className="md:hidden">{col.abbr}</span>
                      <span className="hidden md:inline">{col.label}</span>
                    </>
                  ) : (
                    col.label
                  )}
                </>
              );
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  title={col.title}
                  className={`${col.numeric ? "num" : ""} ${hide} ${sticky} ${isActive ? "!text-white" : ""} ${col.className ?? ""}`}
                >
                  {sort && col.sortable ? (
                    <Link
                      href={sortHref(sort.basePath, sort.params, nextSort(sort.current, col.key, col.defaultDir))}
                      className="inline-flex items-center gap-1 hover:text-white"
                      scroll={false}
                    >
                      {header}
                      <span aria-hidden className={`text-[9px] ${isActive ? "text-blue-400" : "text-slate-700"}`}>
                        {isActive ? (sort.current.dir === "asc" ? "▲" : "▼") : "▼"}
                      </span>
                    </Link>
                  ) : (
                    header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const highlighted = highlightRow?.(row) ?? false;
            return (
              <tr key={rowKey(row, ri)} className={highlighted ? "bg-blue-500/10" : undefined}>
                {columns.map((col, ci) => {
                  const hide = col.hideBelow ? HIDE_CLASS[col.hideBelow] : "";
                  const sticky = stickyFirstColumn && ci === 0 ? "sticky left-0 z-10 bg-[#0b1220]" : "";
                  return (
                    <td
                      key={col.key}
                      className={`${col.numeric ? "num" : ""} ${hide} ${sticky} ${col.className ?? ""}`}
                    >
                      {col.render(row, ri)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
