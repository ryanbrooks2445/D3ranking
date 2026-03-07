"use client";

import { useState, useMemo } from "react";

type ColDef = { key: string; label: string; pct?: boolean };

function formatVal(val: unknown, pct?: boolean): string {
  if (val == null) return "—";
  if (pct && typeof val === "number") return `${(val * 100).toFixed(1)}%`;
  if (typeof val === "number") {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
  }
  return String(val);
}

/** Format player name for display. Prefer first+last when present; else show player_name with optional comma fix. */
function formatPlayerName(row: Record<string, unknown>): string {
  const first = row.first_name != null ? String(row.first_name).trim() : "";
  const last = row.last_name != null ? String(row.last_name).trim() : "";
  if (first && last) {
    const firstDisplay = first.length === 1 ? `${first}.` : first;
    return `${firstDisplay} ${last}`;
  }
  const raw = row.player_name != null ? String(row.player_name).trim() : "";
  if (!raw) return "—";
  const commaIdx = raw.indexOf(",");
  if (commaIdx > 0) {
    const lastPart = raw.slice(0, commaIdx).trim();
    const firstPart = raw.slice(commaIdx + 1).trim();
    if (firstPart && lastPart) return `${firstPart} ${lastPart}`;
    return raw.replace(/,(\S)/, ", $1");
  }
  return raw;
}

/** Psychology-driven OVR tiers: each tier gets a distinct color so ratings feel rewarding. */
function getOvrBadgeClasses(rating: unknown): string | null {
  if (typeof rating !== "number") return null;
  if (rating < 60) return null; // below 60 doesn't deserve a color
  // 99 = legendary (its own color)
  if (rating >= 99) return "inline-flex items-center justify-center rounded-md bg-amber-400/25 px-2 py-0.5 text-sm font-bold text-amber-400 ring-1 ring-amber-400/40";
  // 94–98 = elite
  if (rating >= 94) return "inline-flex items-center justify-center rounded-md bg-violet-500/25 px-2 py-0.5 text-sm font-bold text-violet-400 ring-1 ring-violet-500/40";
  // 90–93 = excellent
  if (rating >= 90) return "inline-flex items-center justify-center rounded-md bg-emerald-500/25 px-2 py-0.5 text-sm font-bold text-emerald-400 ring-1 ring-emerald-500/40";
  // 80–89 = great
  if (rating >= 80) return "inline-flex items-center justify-center rounded-md bg-blue-500/25 px-2 py-0.5 text-sm font-bold text-blue-400 ring-1 ring-blue-500/40";
  // 70–79 = good
  if (rating >= 70) return "inline-flex items-center justify-center rounded-md bg-teal-500/25 px-2 py-0.5 text-sm font-bold text-teal-400 ring-1 ring-teal-500/40";
  // 60–69 = okay (still gets a color)
  return "inline-flex items-center justify-center rounded-md bg-slate-500/25 px-2 py-0.5 text-sm font-bold text-slate-400 ring-1 ring-slate-500/40";
}

/**
 * Rankings table with paywall and search.
 * IMPORTANT: This component always sorts rows by the rank column (global_rank or rank)
 * when present. Do not remove that sort—it prevents global rankings from showing
 * in conference order when the page or pipeline forgets to sort.
 */
export function SportPlayerRankingsTable({
  rows,
  columns,
  isPro,
  freeRowLimit,
  title,
}: {
  rows: Record<string, unknown>[];
  columns: ColDef[];
  isPro: boolean;
  freeRowLimit: number;
  title?: string;
}) {
  const [search, setSearch] = useState("");

  // CRITICAL: Always sort by rank column. Global JSON is often ordered by conference;
  // if the page forgets to sort, the table still shows correct #1, #2, #3... order.
  const rankKey = columns.find((c) => c.key === "global_rank" || c.key === "rank")?.key;

  const sortedRows = useMemo(() => {
    if (rows.length === 0) return rows;
    const sorted = [...rows];
    if (rankKey) {
      // If multiple rows have the same rank (bad export), sort by rating so best show first
      const rank1Count = rows.filter((r) => Number(r[rankKey]) === 1).length;
      if (rank1Count > 1) {
        sorted.sort((a, b) => (Number(b.rating) ?? 0) - (Number(a.rating) ?? 0));
      } else {
        sorted.sort(
          (a, b) =>
            (Number(a[rankKey]) ?? 999_999) - (Number(b[rankKey]) ?? 999_999),
        );
      }
    }
    return sorted;
  }, [rows, rankKey]);

  const filtered = useMemo(() => {
    if (!search.trim() || !isPro) return sortedRows;
    const q = search.toLowerCase().trim();
    return sortedRows.filter(
      (r) =>
        String(r.player_name ?? "").toLowerCase().includes(q) ||
        String(r.team ?? "").toLowerCase().includes(q),
    );
  }, [sortedRows, search, isPro]);

  const showPaywall = !isPro && filtered.length > freeRowLimit;
  const visibleRows = showPaywall ? filtered.slice(0, freeRowLimit) : filtered;

  return (
    <div className="space-y-5">
      {title && (
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      )}

      {isPro && (
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search player or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900/60 shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          {visibleRows.length === 0 ? (
            <div className="px-8 py-16 text-center text-slate-400">
              {rows.length === 0
                ? "No players in this ranking yet."
                : "No players match your search."}
            </div>
          ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-600 bg-slate-800">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-300"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => {
                const rank = Number(row.global_rank ?? row.rank);
                const isTopThree = rank >= 1 && rank <= 3;
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-700/70 transition hover:bg-slate-800/60 ${
                      i % 2 === 1 ? "bg-slate-800/30" : ""
                    } ${isTopThree ? "bg-amber-500/5" : ""}`}
                  >
                    {columns.map((col) => {
                      const val = row[col.key];
                      const isRank = col.key === "global_rank" || col.key === "rank";
                      const isOvr = col.key === "rating";
                      const isPlayerName = col.key === "player_name";
                      const displayVal = isPlayerName
                        ? formatPlayerName(row)
                        : formatVal(val, col.pct);
                      const ovrBadgeClass = isOvr ? getOvrBadgeClasses(val) : null;
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 ${isRank ? "font-bold text-slate-200" : "text-slate-300"} ${isOvr && !ovrBadgeClass ? "text-slate-500" : ""} ${isPlayerName ? "min-w-[140px] whitespace-nowrap font-semibold" : ""}`}
                        >
                          {isOvr && ovrBadgeClass ? (
                            <span className={ovrBadgeClass}>{displayVal}</span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {showPaywall && (
        <div className="rounded-2xl border-2 border-slate-600 bg-slate-900/70 p-10 text-center">
          <p className="text-slate-300 font-medium">
            Showing top {freeRowLimit} of {filtered.length.toLocaleString()} players.
          </p>
          <p className="mt-2 text-slate-400">
            Unlock the full list and search with a 7-day free trial.
          </p>
          <a
            href="/#pricing"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
          >
            Start 7-day free trial
          </a>
        </div>
      )}
    </div>
  );
}
