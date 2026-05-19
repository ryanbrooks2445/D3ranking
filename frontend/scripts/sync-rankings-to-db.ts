/**
 * Sync MBB + baseball rankings JSON into PostgreSQL (Athlete, AthleteSeason, etc.).
 * Run from frontend/: npm run db:sync-rankings
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import { Prisma, RankingEngine } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/db";
import { assignUniqueSlugs, slugifyName, slugifyTeam } from "../src/lib/slugs";

const PILOT_SPORTS: {
  code: string;
  label: string;
  engine: RankingEngine;
  sidearmPath?: string;
}[] = [
  { code: "mbb", label: "Men's Basketball", engine: "mbb", sidearmPath: "mbball" },
  { code: "baseball", label: "Baseball", engine: "baseball_tiered", sidearmPath: "baseball" },
];

type Row = Record<string, unknown>;

function loadJson(filePath: string): Row[] {
  if (!existsSync(filePath)) {
    console.warn(`Missing ${filePath}`);
    return [];
  }
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as unknown;
  return Array.isArray(data) ? (data as Row[]) : [];
}

function parseName(row: Row): { displayName: string; firstName: string | null; lastName: string | null } {
  const first = row.first_name != null ? String(row.first_name).trim() : "";
  const last = row.last_name != null ? String(row.last_name).trim() : "";
  if (first && last) {
    return { displayName: `${first} ${last}`, firstName: first, lastName: last };
  }
  let raw = String(row.player_name ?? "").trim();
  if (!raw) return { displayName: "Unknown", firstName: null, lastName: null };
  const comma = raw.indexOf(",");
  if (comma > 0) {
    const lastPart = raw.slice(0, comma).trim();
    const firstPart = raw.slice(comma + 1).trim();
    if (firstPart && lastPart) {
      return { displayName: `${firstPart} ${lastPart}`, firstName: firstPart, lastName: lastPart };
    }
  }
  return { displayName: raw, firstName: null, lastName: null };
}

function externalKey(sport: string, season: string, team: string, displayName: string, segment: string): string {
  return `${sport}|${season}|${team}|${displayName}|${segment}`.toLowerCase();
}

function rankingsPath(sportCode: string, seasonLabel: string): string {
  const root = path.join(process.cwd(), "public", "data", "sports", sportCode);
  const primary = path.join(root, `rankings_${seasonLabel}.json`);
  if (existsSync(primary)) return primary;
  return path.join(root, "rankings_2025-26.json");
}

function metaSeason(sportCode: string): string {
  const metaPath = path.join(process.cwd(), "public", "data", "sports", sportCode, "meta.json");
  if (!existsSync(metaPath)) return "2025-26";
  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as { season?: string };
    return meta.season ?? "2025-26";
  } catch {
    return "2025-26";
  }
}

async function ensureConference(code: string, name: string) {
  return prisma.conference.upsert({
    where: { code },
    create: { code, name },
    update: { name },
  });
}

async function syncSport(sportDef: (typeof PILOT_SPORTS)[0]) {
  const seasonLabel = metaSeason(sportDef.code);
  const filePath = rankingsPath(sportDef.code, seasonLabel);
  const rows = loadJson(filePath);
  if (rows.length === 0) {
    console.warn(`No rows for ${sportDef.code} at ${filePath}`);
    return;
  }

  const sport = await prisma.sport.upsert({
    where: { code: sportDef.code },
    create: {
      code: sportDef.code,
      label: sportDef.label,
      sidearmPath: sportDef.sidearmPath,
      rankingEngine: sportDef.engine,
      isActive: true,
    },
    update: {
      label: sportDef.label,
      rankingEngine: sportDef.engine,
    },
  });

  await prisma.season.updateMany({
    where: { sportId: sport.id, isCurrent: true },
    data: { isCurrent: false },
  });

  const season = await prisma.season.upsert({
    where: { sportId_label: { sportId: sport.id, label: seasonLabel } },
    create: {
      sportId: sport.id,
      label: seasonLabel,
      isCurrent: true,
    },
    update: { isCurrent: true },
  });

  const names = rows.map((r) => parseName(r).displayName);
  const slugMap = assignUniqueSlugs(names);

  let upserted = 0;
  for (const row of rows) {
    const { displayName, firstName, lastName } = parseName(row);
    const confCode = String(row.conference_code ?? "unknown").trim() || "unknown";
    const confName = String(row.conference ?? confCode).trim() || confCode;
    const teamName = String(row.team ?? "").trim() || "Unknown";
    const segment = String(row.ranking_segment ?? "").trim().toLowerCase();
    const position = row.position != null ? String(row.position).trim() : null;
    const classYear = row.class_year != null ? String(row.class_year).trim() : null;

    const conference = await ensureConference(confCode, confName);
    const teamSlug = slugifyTeam(teamName);
    const team = await prisma.team.upsert({
      where: {
        sportId_seasonId_slug: {
          sportId: sport.id,
          seasonId: season.id,
          slug: teamSlug,
        },
      },
      create: {
        sportId: sport.id,
        seasonId: season.id,
        slug: teamSlug,
        name: teamName,
        conferenceId: conference.id,
      },
      update: {
        name: teamName,
        conferenceId: conference.id,
      },
    });

    const slug = slugMap.get(displayName) ?? slugifyName(displayName);
    const extId = externalKey(sportDef.code, seasonLabel, teamName, displayName, segment);

    let athlete = await prisma.athlete.findFirst({
      where: {
        externalIds: { some: { source: "d3rank", externalId: extId } },
      },
    });

    if (!athlete) {
      athlete = await prisma.athlete.upsert({
        where: { slug },
        create: {
          slug,
          displayName,
          firstName,
          lastName,
          externalIds: {
            create: { source: "d3rank", externalId: extId },
          },
        },
        update: {
          displayName,
          firstName,
          lastName,
        },
      });
    } else {
      athlete = await prisma.athlete.update({
        where: { id: athlete.id },
        data: { displayName, firstName, lastName },
      });
      await prisma.athleteExternalId.upsert({
        where: { source_externalId: { source: "d3rank", externalId: extId } },
        create: { athleteId: athlete.id, source: "d3rank", externalId: extId },
        update: {},
      });
    }

    const globalRank = row.global_rank != null ? Number(row.global_rank) : row.rank != null ? Number(row.rank) : null;
    const rating = row.rating != null ? Number(row.rating) : null;
    const compositeScore = row.composite_score != null ? Number(row.composite_score) : null;

    const eligibilityMeta: Prisma.InputJsonValue = {};
    if (row.gp != null) (eligibilityMeta as Record<string, unknown>).gp = row.gp;
    if (row.mpg != null) (eligibilityMeta as Record<string, unknown>).mpg = row.mpg;

    await prisma.athleteSeason.upsert({
      where: {
        athleteId_seasonId_segment: {
          athleteId: athlete.id,
          seasonId: season.id,
          segment,
        },
      },
      create: {
        athleteId: athlete.id,
        seasonId: season.id,
        teamId: team.id,
        conferenceId: conference.id,
        position: position && position !== "0" ? position : null,
        classYear,
        segment,
        globalRank: Number.isFinite(globalRank) ? globalRank : null,
        rating: Number.isFinite(rating) ? rating : null,
        compositeScore: Number.isFinite(compositeScore) ? compositeScore : null,
        stats: row as Prisma.InputJsonValue,
        eligibilityMeta,
        dataSource: "json_export",
      },
      update: {
        teamId: team.id,
        conferenceId: conference.id,
        position: position && position !== "0" ? position : null,
        classYear,
        globalRank: Number.isFinite(globalRank) ? globalRank : null,
        rating: Number.isFinite(rating) ? rating : null,
        compositeScore: Number.isFinite(compositeScore) ? compositeScore : null,
        stats: row as Prisma.InputJsonValue,
        eligibilityMeta,
      },
    });
    upserted += 1;
  }

  console.log(`Synced ${sportDef.code} (${seasonLabel}): ${upserted} athlete-season rows`);
}

async function main() {
  for (const sport of PILOT_SPORTS) {
    await syncSport(sport);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
