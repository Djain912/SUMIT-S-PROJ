-- Freemium trial & conversion system (Phase 1).
-- Run ONCE in Neon (database: neondb). Safe to re-run — every statement guards.

-- 1. Subscription status enum
DO $$ BEGIN
  CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'PAID', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. User trial columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartedAt"     TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialExpiresAt"     TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubStatus";

-- Backfill: existing paying/coupon users are PAID; everyone else left NULL
-- (they pre-date the trial system and keep whatever access they already have).
UPDATE "User" SET "subscriptionStatus" = 'PAID'
  WHERE "isPremium" = true AND "subscriptionStatus" IS NULL;

-- 3. Chapter trial flag
ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "isTrialFree" BOOLEAN NOT NULL DEFAULT false;

-- 4. UserActivity table (1:1 with User)
CREATE TABLE IF NOT EXISTS "UserActivity" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "loginCount"         INTEGER NOT NULL DEFAULT 0,
  "lastLoginAt"        TIMESTAMP(3),
  "chaptersViewed"     JSONB NOT NULL DEFAULT '[]',
  "mcqAttempted"       INTEGER NOT NULL DEFAULT 0,
  "mockAttempted"      INTEGER NOT NULL DEFAULT 0,
  "scholarUsed"        INTEGER NOT NULL DEFAULT 0,
  "indicatorLabUsed"   INTEGER NOT NULL DEFAULT 0,
  "firstChapterDoneAt" TIMESTAMP(3),
  "timeSpentSeconds"   INTEGER NOT NULL DEFAULT 0,
  "promptsSeen"        JSONB NOT NULL DEFAULT '[]',
  "lastDripDay"        INTEGER,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserActivity_userId_key" ON "UserActivity"("userId");

DO $$ BEGIN
  ALTER TABLE "UserActivity"
    ADD CONSTRAINT "UserActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
