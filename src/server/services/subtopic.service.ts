import { prisma } from '@/lib/db/prisma';
import type { SubtopicInput } from '@/server/validators/content';

type SubtopicMutationInput = SubtopicInput & { slug: string };

export async function listSubtopics(chapterId: string) {
  return prisma.subtopic.findMany({
    where: {
      chapterId,
    },
    orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
  });
}

export async function createSubtopic(input: SubtopicMutationInput) {
  return prisma.subtopic.create({ data: input });
}

export async function updateSubtopic(id: string, input: SubtopicMutationInput) {
  return prisma.subtopic.update({ where: { id }, data: input });
}

export async function deleteSubtopic(id: string) {
  return prisma.subtopic.delete({
    where: { id },
  });
}

export async function restoreSubtopic(id: string) {
  return prisma.subtopic.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
}
