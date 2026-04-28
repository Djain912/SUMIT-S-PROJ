import { prisma } from '@/lib/db/prisma';
import type { ChapterInput } from '@/server/validators/content';

export async function listChapters(level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3', includeDeleted = false) {
  return prisma.chapter.findMany({
    where: {
      ...(level ? { level } : undefined),
    },
    orderBy: [{ level: 'asc' }, { chapterNo: 'asc' }, { title: 'asc' }],
    include: {
      _count: {
        select: { subtopics: true },
      },
    },
  });
}

export async function createChapter(input: ChapterInput) {
  return prisma.chapter.create({ data: input });
}

export async function updateChapter(id: string, input: ChapterInput) {
  return prisma.chapter.update({ where: { id }, data: input });
}

export async function deleteChapter(id: string) {
  return prisma.chapter.delete({
    where: { id },
  });
}

export async function restoreChapter(id: string) {
  return prisma.chapter.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
}