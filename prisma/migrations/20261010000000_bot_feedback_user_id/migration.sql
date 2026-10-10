-- AlterTable
ALTER TABLE "BotFeedback" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BotFeedback_userId_idx" ON "BotFeedback"("userId");
