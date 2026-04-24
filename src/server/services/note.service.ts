import { prisma } from '@/lib/db/prisma';

export async function listNotes(subtopicId: string) {
  return prisma.note.findMany({
    where: { subtopicId },
    orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
  });
}

export async function createNote(input: {
  subtopicId: string;
  title: string;
  contentHtml?: string | null;
  contentJson?: Record<string, unknown>;
  orderIndex: number;
  isPublished: boolean;
}, createdById?: string) {
  return prisma.note.create({
    data: {
      subtopicId: input.subtopicId,
      title: input.title,
      contentHtml: input.contentHtml ?? null,
      contentJson: input.contentJson ?? { type: 'doc', content: [] },
      orderIndex: input.orderIndex,
      isPublished: input.isPublished,
      createdById,
      updatedById: createdById,
    },
  });
}

export async function updateNote(id: string, input: {
  title?: string;
  contentHtml?: string | null;
  contentJson?: Record<string, unknown>;
  orderIndex?: number;
  isPublished?: boolean;
}, updatedById?: string) {
  return prisma.note.update({
    where: { id },
    data: {
      ...input,
      updatedById,
    },
  });
}

export async function deleteNote(id: string) {
  return prisma.note.delete({ where: { id } });
}