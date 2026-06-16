-- Index Builder persistence — run ONCE in the Neon SQL Editor (database: neondb).
-- Safe to re-run: every statement guards against "already exists".

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "IndexWeighting" AS ENUM ('EQUAL', 'MARKET_CAP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IndexVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Index table (user-saved custom indices)
CREATE TABLE IF NOT EXISTS "Index" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "weightingType" "IndexWeighting" NOT NULL DEFAULT 'MARKET_CAP',
  "constituents"  JSONB NOT NULL,
  "customWeights" JSONB,
  "description"   TEXT,
  "visibility"    "IndexVisibility" NOT NULL DEFAULT 'PRIVATE',
  "shareId"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Index_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Index_shareId_key" ON "Index"("shareId");
CREATE INDEX IF NOT EXISTS "Index_userId_updatedAt_idx" ON "Index"("userId", "updatedAt");

-- 4. Foreign key to User (guarded so re-running won't error)
DO $$ BEGIN
  ALTER TABLE "Index"
    ADD CONSTRAINT "Index_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
