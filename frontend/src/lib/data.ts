/**
 * Base URL for /data/* files. In production (Vercel) we don't deploy public/data
 * (see .vercelignore), so we fetch from GitHub Raw. Set DATA_BASE_URL to override
 * (e.g. your own CDN). Local dev uses the running app.
 */
function getDataBaseUrl(): string {
  if (process.env.DATA_BASE_URL) return process.env.DATA_BASE_URL;
  if (process.env.VERCEL) {
    return "https://raw.githubusercontent.com/ryanbrooks2445/D3ranking/main/frontend/public/data";
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (appUrl) return appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
  return "http://localhost:3000";
}

/**
 * Read a data file. On Vercel we fetch from DATA_BASE_URL (default: GitHub Raw);
 * locally we fetch from the running app so /public/data is never in the serverless bundle.
 */
export async function readDataFile(relativePath: string): Promise<string> {
  const baseUrl = getDataBaseUrl().replace(/\/$/, "");
  const path = relativePath.replace(/^\/+/, "");
  const url = baseUrl.includes("raw.githubusercontent.com")
    ? `${baseUrl}/${path}`
    : `${baseUrl}/data/${path}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Data file not found: ${relativePath}`);
  }
  return res.text();
}

/** Same as readDataFile but returns null instead of throwing. */
export async function readDataFileSafe(relativePath: string): Promise<string | null> {
  try {
    return await readDataFile(relativePath);
  } catch {
    return null;
  }
}

const DEFAULT_SEASON = "2025-26";

/** Sports whose current data is from the prior season (spring sports; next season not yet available). */
const PRIOR_YEAR_DATA_SPORTS = ["baseball", "softball", "mlax", "wlax"];
const PRIOR_YEAR_SEASON_LABEL = "2024-25";
const PRIOR_YEAR_NOTE = "Last season's data. Current season rankings will update when available.";

/**
 * Get the current season for a sport. Reads from sports/{code}/meta.json when present;
 * otherwise returns the default season (e.g. "2025-26").
 */
export async function getSeason(sportCode: string): Promise<string> {
  const code = sportCode.toLowerCase();
  const raw = await readDataFileSafe(`sports/${code}/meta.json`);
  if (!raw) return DEFAULT_SEASON;
  try {
    const meta = JSON.parse(raw) as { season?: string };
    return meta.season ?? DEFAULT_SEASON;
  } catch {
    return DEFAULT_SEASON;
  }
}

/**
 * Get season label and optional note for display. For spring sports with prior-year data,
 * returns 2024-25 and a note. Otherwise returns the season from meta and no note.
 */
export async function getSeasonDisplay(sportCode: string): Promise<{
  seasonLabel: string;
  note: string | null;
}> {
  const code = sportCode.toLowerCase();
  const season = await getSeason(code);
  if (PRIOR_YEAR_DATA_SPORTS.includes(code)) {
    return { seasonLabel: PRIOR_YEAR_SEASON_LABEL, note: PRIOR_YEAR_NOTE };
  }
  return { seasonLabel: season, note: null };
}

/** Sports that show a data-quality disclaimer (e.g. hockey). */
const DATA_QUALITY_NOTE_SPORTS: Record<string, string> = {
  mhky:
    "Hockey rankings use conference stats. Use the Skaters tab to filter to non-goalies. Some rows may show incomplete data.",
  whky:
    "Hockey rankings use conference stats. Use the Skaters tab to filter to non-goalies. Some rows may show incomplete data.",
};

/**
 * Optional note about data quality or coverage for a sport (e.g. hockey).
 */
export function getDataQualityNote(sportCode: string): string | null {
  return DATA_QUALITY_NOTE_SPORTS[sportCode.toLowerCase()] ?? null;
}
