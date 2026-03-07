import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Try to read a file under public/data. Tries cwd (e.g. frontend/) then cwd/frontend
 * so it works whether you run next dev from NCAA_Project or NCAA_Project/frontend.
 */
export async function readDataFile(relativePath: string): Promise<string> {
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
