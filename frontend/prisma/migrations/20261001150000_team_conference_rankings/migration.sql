-- CreateEnum
CREATE TYPE "RankingEntityType" AS ENUM ('team', 'conference', 'player');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "shortName" TEXT;

-- CreateTable
CREATE TABLE "TeamSeasonStat" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gamesPlayed" INTEGER,
    "rosterCount" INTEGER,
    "rankedPlayerCount" INTEGER,
    "pointsPerGame" DOUBLE PRECISION,
    "reboundsPerGame" DOUBLE PRECISION,
    "assistsPerGame" DOUBLE PRECISION,
    "turnoversPerGame" DOUBLE PRECISION,
    "stealsPerGame" DOUBLE PRECISION,
    "blocksPerGame" DOUBLE PRECISION,
    "fieldGoalPct" DOUBLE PRECISION,
    "threePointPct" DOUBLE PRECISION,
    "freeThrowPct" DOUBLE PRECISION,
    "wins" INTEGER,
    "losses" INTEGER,
    "conferenceWins" INTEGER,
    "conferenceLosses" INTEGER,
    "pointsAllowedPerGame" DOUBLE PRECISION,
    "offensiveRating" DOUBLE PRECISION,
    "defensiveRating" DOUBLE PRECISION,
    "strengthOfSchedule" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "rawStrength" DOUBLE PRECISION,
    "nationalRank" INTEGER,
    "conferenceRank" INTEGER,
    "previousNationalRank" INTEGER,
    "ratingVersion" TEXT,
    "extra" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSeasonStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceSeason" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "rankedTeamCount" INTEGER,
    "avgTeamRating" DOUBLE PRECISION,
    "medianTeamRating" DOUBLE PRECISION,
    "topTeamRating" DOUBLE PRECISION,
    "top3AvgRating" DOUBLE PRECISION,
    "teamsInTop25" INTEGER,
    "rating" DOUBLE PRECISION,
    "nationalRank" INTEGER,
    "previousNationalRank" INTEGER,
    "ratingVersion" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenceSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "entityType" "RankingEntityType" NOT NULL,
    "version" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonStat_teamId_key" ON "TeamSeasonStat"("teamId");

-- CreateIndex
CREATE INDEX "TeamSeasonStat_rating_idx" ON "TeamSeasonStat"("rating" DESC);

-- CreateIndex
CREATE INDEX "TeamSeasonStat_nationalRank_idx" ON "TeamSeasonStat"("nationalRank");

-- CreateIndex
CREATE INDEX "ConferenceSeason_seasonId_nationalRank_idx" ON "ConferenceSeason"("seasonId", "nationalRank");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceSeason_conferenceId_seasonId_key" ON "ConferenceSeason"("conferenceId", "seasonId");

-- CreateIndex
CREATE INDEX "RankingSnapshot_seasonId_entityType_computedAt_idx" ON "RankingSnapshot"("seasonId", "entityType", "computedAt" DESC);

-- AddForeignKey
ALTER TABLE "TeamSeasonStat" ADD CONSTRAINT "TeamSeasonStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSeason" ADD CONSTRAINT "ConferenceSeason_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSeason" ADD CONSTRAINT "ConferenceSeason_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSeason" ADD CONSTRAINT "ConferenceSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

