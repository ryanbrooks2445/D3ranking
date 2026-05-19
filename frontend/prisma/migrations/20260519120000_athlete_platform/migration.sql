-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('unclaimed', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "ProfileClaimRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RankingEngine" AS ENUM ('mbb', 'baseball_tiered', 'composite', 'clippd_golf');

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sidearmPath" TEXT,
    "rankingEngine" "RankingEngine" NOT NULL DEFAULT 'composite',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "conferenceId" TEXT,
    "seasonId" TEXT,
    "externalSchoolId" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'unclaimed',
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteExternalId" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    CONSTRAINT "AthleteExternalId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSeason" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT,
    "conferenceId" TEXT,
    "position" TEXT,
    "classYear" TEXT,
    "segment" TEXT NOT NULL DEFAULT '',
    "globalRank" INTEGER,
    "rating" INTEGER,
    "compositeScore" DOUBLE PRECISION,
    "stats" JSONB NOT NULL,
    "eligibilityMeta" JSONB,
    "sourceRank" INTEGER,
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPlayerSummary" (
    "id" TEXT NOT NULL,
    "athleteSeasonId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "summaryMarkdown" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPlayerSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileClaimRequest" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "status" "ProfileClaimRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_code_key" ON "Sport"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Conference_code_key" ON "Conference"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Season_sportId_label_key" ON "Season"("sportId", "label");

-- CreateIndex
CREATE INDEX "Season_sportId_isCurrent_idx" ON "Season"("sportId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sportId_seasonId_slug_key" ON "Team"("sportId", "seasonId", "slug");

-- CreateIndex
CREATE INDEX "Team_conferenceId_idx" ON "Team"("conferenceId");

-- CreateIndex
CREATE INDEX "Team_sportId_name_idx" ON "Team"("sportId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_slug_key" ON "Athlete"("slug");

-- CreateIndex
CREATE INDEX "Athlete_displayName_idx" ON "Athlete"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteExternalId_source_externalId_key" ON "AthleteExternalId"("source", "externalId");

-- CreateIndex
CREATE INDEX "AthleteExternalId_athleteId_idx" ON "AthleteExternalId"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSeason_athleteId_seasonId_segment_key" ON "AthleteSeason"("athleteId", "seasonId", "segment");

-- CreateIndex
CREATE INDEX "AthleteSeason_seasonId_globalRank_idx" ON "AthleteSeason"("seasonId", "globalRank");

-- CreateIndex
CREATE INDEX "AthleteSeason_seasonId_rating_idx" ON "AthleteSeason"("seasonId", "rating" DESC);

-- CreateIndex
CREATE INDEX "AthleteSeason_teamId_idx" ON "AthleteSeason"("teamId");

-- CreateIndex
CREATE INDEX "AthleteSeason_conferenceId_idx" ON "AthleteSeason"("conferenceId");

-- CreateIndex
CREATE INDEX "ProfileView_athleteId_createdAt_idx" ON "ProfileView"("athleteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiPlayerSummary_athleteSeasonId_key" ON "AiPlayerSummary"("athleteSeasonId");

-- CreateIndex
CREATE INDEX "ProfileClaimRequest_athleteId_status_idx" ON "ProfileClaimRequest"("athleteId", "status");

-- CreateIndex
CREATE INDEX "ProfileClaimRequest_email_idx" ON "ProfileClaimRequest"("email");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteExternalId" ADD CONSTRAINT "AthleteExternalId_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSeason" ADD CONSTRAINT "AthleteSeason_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPlayerSummary" ADD CONSTRAINT "AiPlayerSummary_athleteSeasonId_fkey" FOREIGN KEY ("athleteSeasonId") REFERENCES "AthleteSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileClaimRequest" ADD CONSTRAINT "ProfileClaimRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileClaimRequest" ADD CONSTRAINT "ProfileClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
