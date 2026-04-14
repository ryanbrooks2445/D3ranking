"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { PRO_TRIAL_LABEL } from "@/lib/billing";

type ColDef = { key: string; label: string; pct?: boolean };

/** Tooltip explaining OVR and Score. */
const OVR_TOOLTIP =
  "OVR is derived from rank (e.g. top players = 99). Score is the stat-based composite used to rank players.";

/** Keys that are identity/rank, not stats — we always show the value (including 0). */
const ALWAYS_VISIBLE_KEYS = new Set([
  "global_rank", "rank", "player_name", "team", "position", "conference", "rating", "composite_score",
]);
const DECIMAL_RATE_KEYS = new Set([
  "hitting_stats_batting_average",
  "hitting_stats_onbase_percentage",
  "hitting_stats_slugging_percentage",
  "pitching_stats_opponent_batting_average",
]);

function formatVal(val: unknown, pct?: boolean, colKey?: string): string {
  if (val == null) return "—";
  const isStat = colKey && !ALWAYS_VISIBLE_KEYS.has(colKey);
  const numVal = typeof val === "number" ? val : Number(val);
  if (isStat && (numVal === 0 || (typeof val === "string" && val.trim() === "0"))) return "—";
  if (colKey && DECIMAL_RATE_KEYS.has(colKey) && Number.isFinite(numVal)) {
    return numVal.toFixed(3).replace(/^0/, "");
  }
  if (pct && typeof val === "number") return `${(val * 100).toFixed(1)}%`;
  if (typeof val === "number") {
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(1);
  }
  return String(val);
}

/** Format composite_score (float) for display. Show — for null/NaN/0 so we don't show zeros. */
function formatScore(val: unknown): string {
  if (val == null) return "—";
  const n = Number(val);
  if (Number.isNaN(n) || n === 0) return "—";
  return n.toFixed(1);
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
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if (ALWAYS_VISIBLE_KEYS.has(col.key)) return true;
      return rows.some((row) => {
        const val = row[col.key];
        if (val == null) return false;
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (!trimmed || trimmed === "0" || trimmed === "0.0" || trimmed === ".000") return false;
        }
        const numVal = typeof val === "number" ? val : Number(val);
        if (Number.isFinite(numVal)) return numVal !== 0;
        return true;
      });
    });
  }, [columns, rows]);

  // CRITICAL: Always sort by rank column. Global JSON is often ordered by conference;
  // if the page forgets to sort, the table still shows correct #1, #2, #3... order.
  const rankKey = visibleColumns.find((c) => c.key === "global_rank" || c.key === "rank")?.key;

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
    const q = search.toLowerCase().trim();
    if (!q) return sortedRows;
    return sortedRows.filter(
      (r) =>
        String(r.player_name ?? "").toLowerCase().includes(q) ||
        String(r.team ?? "").toLowerCase().includes(q),
    );
  }, [sortedRows, search]);

  const hasSearch = search.trim().length > 0;
  const showPaywall = !isPro && !hasSearch && filtered.length > freeRowLimit;
  const visibleRows =
    !isPro && !hasSearch && showPaywall
      ? filtered.slice(0, freeRowLimit)
      : filtered;

  return (
    <div className="space-y-5">
      {title && (
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <input
            type="search"
            placeholder="Search player or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-3 text-base text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:py-2.5 sm:text-sm"
          />
        </div>
        {!isPro && (
          <p className="hidden text-xs text-slate-500 sm:inline">
            OVR, Rank, and Score in search results are Pro-only.{" "}
            <Link
              href="/#pricing"
              className="font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              Try Pro Free to unlock.
            </Link>
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900/60 shadow-xl shadow-black/20">
        <div className="overflow-x-auto overflow-y-hidden">
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
                {visibleColumns.map((col) => (
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
                    {visibleColumns.map((col) => {
                      const val = row[col.key];
                      const isRank = col.key === "global_rank" || col.key === "rank";
                      const isOvr = col.key === "rating";
                      const isScore = col.key === "composite_score";
                      const isPlayerName = col.key === "player_name";
                      const isPosition = col.key === "position";
                      const displayVal = isPlayerName
                        ? formatPlayerName(row)
                        : isScore
                          ? formatScore(val)
                          : isPosition && (val === "0" || val === 0)
                            ? "—"
                            : formatVal(val, col.pct, col.key);
                      const ovrBadgeClass = isOvr ? getOvrBadgeClasses(val) : null;
                      // Free preview (top N rows): show real Rank, OVR, Score. Search results: show locked look.
                      const isLockedMetric = !isPro && hasSearch && (isRank || isOvr || isScore);
                      const lockedLabel = isOvr ? "Get OVR" : isScore ? "Get score" : "Unlock";
                      const cellContent = isLockedMetric ? (
                        <Link
                          href="/#pricing"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-500/10 hover:text-amber-200"
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {lockedLabel}
                        </Link>
                      ) : isOvr && ovrBadgeClass ? (
                        <span className={ovrBadgeClass}>{displayVal}</span>
                      ) : (
                        displayVal
                      );
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 ${isRank ? "font-bold text-slate-200" : "text-slate-300"} ${isOvr && !ovrBadgeClass ? "text-slate-500" : ""} ${isPlayerName ? "min-w-[140px] whitespace-nowrap font-semibold" : ""} ${isScore ? "tabular-nums" : ""}`}
                        >
                          {isOvr && !isLockedMetric ? (
                            <span title={OVR_TOOLTIP}>{cellContent}</span>
                          ) : (
                            cellContent
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
            Unlock full list, OVR, rank, score, and search with Pro after a {PRO_TRIAL_LABEL}.
          </p>
          <Link
            href="/#pricing"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-500"
          >
            Try Pro Free
          </Link>
        </div>
      )}
    </div>
  );
}
