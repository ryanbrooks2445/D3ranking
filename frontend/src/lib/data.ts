function getDataBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (envUrl) return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  // Fallback for local dev
  return "http://localhost:3000";
}

/**
 * Read a JSON or CSV file that lives under /public/data by fetching it from the app itself.
 * This keeps the huge data folder out of the serverless bundle on Vercel while still working
 * locally (Next dev serves /public at /).
 */
export async function readDataFile(relativePath: string): Promise<string> {
  const baseUrl = getDataBaseUrl();
  const url = `${baseUrl}/data/${relativePath.replace(/^\/+/, "")}`;
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
