/** Shared number/text formatting so every page renders stats identically. */

export const EM_DASH = "—";

function finite(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 12 → "#12". Null → "NR" (not ranked) or dash. */
export function formatRank(rank: number | null | undefined, unrankedLabel = "NR"): string {
  const n = finite(rank);
  return n == null ? unrankedLabel : `#${Math.round(n)}`;
}

/** Ratings are shown with one decimal: 71.8 */
export function formatRating(value: number | null | undefined): string {
  const n = finite(value);
  return n == null ? EM_DASH : n.toFixed(1);
}

/** Per-game averages: 85.6 */
export function formatPerGame(value: number | null | undefined, decimals = 1): string {
  const n = finite(value);
  return n == null ? EM_DASH : n.toFixed(decimals);
}

/** 0.482 → "48.2%". Values already in percent (>1) are passed through. */
export function formatPct(value: number | null | undefined, decimals = 1): string {
  const n = finite(value);
  if (n == null) return EM_DASH;
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(decimals)}%`;
}

/** Baseball-style rate: 0.3125 → ".313" */
export function formatRate3(value: number | null | undefined): string {
  const n = finite(value);
  return n == null ? EM_DASH : n.toFixed(3).replace(/^0/, "");
}

export function formatInt(value: number | null | undefined): string {
  const n = finite(value);
  return n == null ? EM_DASH : Math.round(n).toLocaleString("en-US");
}

/** 21, 5 → "21-5". Either side missing → dash (never fabricate a record). */
export function formatRecord(wins: number | null | undefined, losses: number | null | undefined): string {
  const w = finite(wins);
  const l = finite(losses);
  if (w == null || l == null) return EM_DASH;
  return `${Math.round(w)}-${Math.round(l)}`;
}

/** Rank movement: previous 8 → current 5 yields "+3". Null when no history. */
export function formatRankChange(
  current: number | null | undefined,
  previous: number | null | undefined,
): string | null {
  const c = finite(current);
  const p = finite(previous);
  if (c == null || p == null) return null;
  const delta = p - c;
  if (delta === 0) return "–";
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Generic stat formatter driven by a column kind. */
export type StatKind = "int" | "perGame" | "pct" | "rate3" | "rating" | "rank" | "text";

export function formatStat(value: unknown, kind: StatKind): string {
  switch (kind) {
    case "int":
      return formatInt(value as number | null);
    case "perGame":
      return formatPerGame(value as number | null);
    case "pct":
      return formatPct(value as number | null);
    case "rate3":
      return formatRate3(value as number | null);
    case "rating":
      return formatRating(value as number | null);
    case "rank":
      return formatRank(value as number | null);
    case "text":
      return value == null || value === "" ? EM_DASH : String(value);
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** "Conference of New England (CCC)" → "CCC"; falls back to the code uppercased. */
export function conferenceShortName(name: string | null | undefined, code?: string | null): string {
  const paren = name?.match(/\(([^)]+)\)\s*$/);
  if (paren) return paren[1];
  if (name && name.split(" ").length <= 2) return name;
  return (code ?? name ?? "").replace(/_/g, " ").toUpperCase();
}

/** pandas exports missing strings as "nan"; treat them as empty. */
function cleanNamePart(value: unknown): string {
  const s = value == null ? "" : String(value).trim();
  return /^(nan|none|null)$/i.test(s) ? "" : s;
}

/** Player display: prefer "First Last"; fix "Last,First" exports and stray "nan" tokens. */
export function formatPlayerName(row: {
  first_name?: unknown;
  last_name?: unknown;
  player_name?: unknown;
}): string {
  const first = cleanNamePart(row.first_name);
  const last = cleanNamePart(row.last_name);
  if (first && last) return `${first.length === 1 ? `${first}.` : first} ${last}`;
  const raw = cleanNamePart(row.player_name).replace(/\s+(nan|none)$/i, "");
  if (!raw) return EM_DASH;
  const comma = raw.indexOf(",");
  if (comma > 0) {
    const lastPart = raw.slice(0, comma).trim();
    const firstPart = raw.slice(comma + 1).trim();
    if (firstPart && lastPart) return `${firstPart} ${lastPart}`;
  }
  return raw;
}
