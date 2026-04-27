-- CreateEnum
CREATE TYPE "QuestionReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "QuizFlagColor" AS ENUM ('YELLOW', 'RED');

-- AlterTable
ALTER TABLE "QuizAttemptItem" ADD COLUMN     "flagColor" "QuizFlagColor",
ADD COLUMN     "flaggedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "QuestionReport" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "QuestionReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionReport_status_createdAt_idx" ON "QuestionReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionReport_questionId_status_idx" ON "QuestionReport"("questionId", "status");

-- CreateIndex
CREATE INDEX "QuestionReport_userId_createdAt_idx" ON "QuestionReport"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReport_questionId_userId_key" ON "QuestionReport"("questionId", "userId");

-- CreateIndex
CREATE INDEX "QuizAttemptItem_attemptId_flagColor_idx" ON "QuizAttemptItem"("attemptId", "flagColor");

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
