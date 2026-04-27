import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function listNotes(subtopicId: string, includeDeleted = false) {
  return prisma.note.findMany({
    where: {
      subtopicId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    orderBy: [{ orderIndex: 'asc' }, { title: 'asc' }],
  });
}

export async function createNote(input: {
  subtopicId: string;
  title: string;
  contentHtml?: string | null;
  contentJson?: Record<string, unknown>;
  watermarkConfig?: Record<string, unknown> | null;
  orderIndex: number;
  isPublished: boolean;
}, createdById?: string) {
  return prisma.note.create({
    data: {
      subtopicId: input.subtopicId,
      title: input.title,
      contentHtml: input.contentHtml ?? null,
      contentJson: (input.contentJson ?? { type: 'doc', content: [] }) as object,
      watermarkConfig: input.watermarkConfig ? (input.watermarkConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
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
  watermarkConfig?: Record<string, unknown> | null;
  orderIndex?: number;
  isPublished?: boolean;
}, updatedById?: string) {
  const data: Record<string, unknown> = { ...input };
  
  if (updatedById) {
    data.updatedById = updatedById;
  }
  
  if (input.contentJson) {
    data.contentJson = input.contentJson as object;
  }

  return prisma.note.update({
    where: { id },
    data,
  });
}

export async function deleteNote(id: string) {
  return prisma.note.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}

export async function restoreNote(id: string) {
  return prisma.note.update({
    where: { id },
    data: { isDeleted: false, deletedAt: null },
  });
}