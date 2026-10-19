-- AlterTable
ALTER TABLE "MarketObservation" ADD COLUMN IF NOT EXISTS "postText" TEXT;
ALTER TABLE "MarketObservation" ADD COLUMN IF NOT EXISTS "insightKey" TEXT;
ALTER TABLE "MarketObservation" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketObservation_insightKey_idx" ON "MarketObservation"("insightKey");
