import { readFile } from "node:fs/promises";
import path from "node:path";

function getDataBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return null;
}

/**
 * Try to read a file under public/data.
 * In production (Vercel), fetches from the app's own static assets so the
 * serverless bundle stays under size limits. Locally and at build time reads from filesystem.
 */
export async function readDataFile(relativePath: string): Promise<string> {
  const baseUrl = getDataBaseUrl();

  // Prefer filesystem (build + local dev); on Vercel runtime the bundle may omit public/data
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, "public", "data", relativePath),
    path.join(cwd, "frontend", "public", "data", relativePath),
  ];
  for (const p of paths) {
    try {
      return await readFile(p, "utf-8");
    } catch {
      continue;
    }
  }

  // Fallback: fetch from our own static assets (Vercel runtime when bundle has no data)
  if (baseUrl) {
    const url = `${baseUrl}/data/${relativePath.replace(/^\/+/, "")}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) return res.text();
  }

  throw new Error(`Data file not found: ${relativePath}`);
}

/** Same as readDataFile but returns null instead of throwing. */
export async function readDataFileSafe(relativePath: string): Promise<string | null> {
  try {
    return await readDataFile(relativePath);
  } catch {
    return null;
  }
}
