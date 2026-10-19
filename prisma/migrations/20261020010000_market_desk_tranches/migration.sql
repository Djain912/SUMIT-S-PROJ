-- AlterTable
ALTER TABLE "MarketObservation" ADD COLUMN IF NOT EXISTS "slot" TEXT;
ALTER TABLE "MarketObservation" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
