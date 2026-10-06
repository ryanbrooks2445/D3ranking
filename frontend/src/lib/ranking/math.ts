export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function populationStdDev(values: number[]): number | null {
  const m = mean(values);
  if (m == null) return null;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Map raw values onto a T-score scale (mean 50, SD 10). Constant inputs all map to 50. */
export function toTScores(values: number[]): number[] {
  const m = mean(values);
  const sd = populationStdDev(values);
  if (m == null || sd == null || sd === 0) return values.map(() => 50);
  return values.map((v) => 50 + ((v - m) / sd) * 10);
}

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Competition ranking ("1224"): equal scores share a rank and the next rank skips.
 * Items with a null score receive a null rank. Higher score ranks first.
 */
export function assignRanks<T>(
  items: T[],
  score: (item: T) => number | null,
): (number | null)[] {
  const indexed = items
    .map((item, idx) => ({ idx, score: score(item) }))
    .filter((x): x is { idx: number; score: number } => x.score != null && Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);

  const ranks: (number | null)[] = items.map(() => null);
  let lastScore: number | null = null;
  let lastRank = 0;
  indexed.forEach((entry, position) => {
    const rank = entry.score === lastScore ? lastRank : position + 1;
    ranks[entry.idx] = rank;
    lastScore = entry.score;
    lastRank = rank;
  });
  return ranks;
}
