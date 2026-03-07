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
