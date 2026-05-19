/** Sport-specific ranking engine identifiers (mirrors Prisma RankingEngine). */
export const RANKING_ENGINE_BY_SPORT: Record<string, string> = {
  mbb: "mbb",
  baseball: "baseball_tiered",
  mgolf: "clippd_golf",
  wgolf: "clippd_golf",
};

export function getRankingEngineLabel(sportCode: string): string {
  return RANKING_ENGINE_BY_SPORT[sportCode] ?? "composite";
}
