/*
  Warnings:

  - You are about to drop the column `orderIndex` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Chapter` table. All the data in the column will be lost.
  - The `status` column on the `QuestionReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `orderIndex` on the `Subtopic` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Subtopic` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- DropIndex
DROP INDEX "Chapter_level_isDeleted_orderIndex_idx";

-- DropIndex
DROP INDEX "Chapter_level_isPublished_orderIndex_idx";

-- DropIndex
DROP INDEX "Chapter_level_slug_key";

-- DropIndex
DROP INDEX "QuestionReport_questionId_status_idx";

-- DropIndex
DROP INDEX "QuestionReport_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Subtopic_chapterId_isDeleted_orderIndex_idx";

-- DropIndex
DROP INDEX "Subtopic_chapterId_isPublished_orderIndex_idx";

-- DropIndex
DROP INDEX "Subtopic_chapterId_slug_key";

-- AlterTable
ALTER TABLE "Chapter" DROP COLUMN "orderIndex",
DROP COLUMN "slug",
ADD COLUMN     "chapterNo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QuestionReport" DROP COLUMN "status",
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Subtopic" DROP COLUMN "orderIndex",
DROP COLUMN "slug",
ADD COLUMN     "subtopicNo" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "QuestionReportStatus";

-- CreateTable
CREATE TABLE "NoteReport" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteReport_status_createdAt_idx" ON "NoteReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoteReport_noteId_userId_key" ON "NoteReport"("noteId", "userId");

-- CreateIndex
CREATE INDEX "Chapter_level_isPublished_chapterNo_idx" ON "Chapter"("level", "isPublished", "chapterNo");

-- CreateIndex
CREATE INDEX "Chapter_level_isDeleted_chapterNo_idx" ON "Chapter"("level", "isDeleted", "chapterNo");

-- CreateIndex
CREATE INDEX "QuestionReport_status_createdAt_idx" ON "QuestionReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "QuizAttemptItem_attemptId_isCorrect_idx" ON "QuizAttemptItem"("attemptId", "isCorrect");

-- CreateIndex
CREATE INDEX "Subtopic_chapterId_isPublished_subtopicNo_idx" ON "Subtopic"("chapterId", "isPublished", "subtopicNo");

-- CreateIndex
CREATE INDEX "Subtopic_chapterId_isDeleted_subtopicNo_idx" ON "Subtopic"("chapterId", "isDeleted", "subtopicNo");

-- AddForeignKey
ALTER TABLE "NoteReport" ADD CONSTRAINT "NoteReport_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteReport" ADD CONSTRAINT "NoteReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
