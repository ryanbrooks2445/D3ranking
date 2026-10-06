/**
 * Compute team + conference ratings for a sport's current season and persist them.
 * Expects public/data/sports/{sport}/teams_{season}.json from export_team_stats.py.
 *
 * Run from frontend/: npm run db:compute-rankings [-- mbb]
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { existsSync, readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import { computeAndPersistRankings, type TeamStatsRecord } from "../src/lib/ranking/compute";

function loadTeamStats(sportCode: string): TeamStatsRecord[] {
  const dir = path.join(process.cwd(), "public", "data", "sports", sportCode);
  const metaPath = path.join(dir, "meta.json");
  let season = "2025-26";
  if (existsSync(metaPath)) {
    try {
      season = (JSON.parse(readFileSync(metaPath, "utf-8")) as { season?: string }).season ?? season;
    } catch {
      // fall back to default season
    }
  }
  const file = path.join(dir, `teams_${season}.json`);
  if (!existsSync(file)) {
    console.warn(`No team stats file at ${file}; ratings will be computed from roster composites only.`);
    return [];
  }
  return JSON.parse(readFileSync(file, "utf-8")) as TeamStatsRecord[];
}

async function main() {
  const sportCode = (process.argv[2] ?? "mbb").toLowerCase();
  const stats = loadTeamStats(sportCode);
  const summary = await computeAndPersistRankings(prisma, sportCode, stats);
  console.log(
    `${summary.sportCode} ${summary.seasonLabel}: rated ${summary.teamsRated} teams ` +
      `(${summary.teamsRanked} ranked, ${summary.teamsWithStats} with stats), ` +
      `${summary.conferencesRated} conferences`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
