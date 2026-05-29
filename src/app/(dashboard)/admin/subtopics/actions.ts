'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/server/policies/auth';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSubtopicSlug(chapterId: string, base: string, excludeId?: string): Promise<string> {
  const slug = toSlug(base) || 'subtopic';
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.subtopic.findFirst({
      where: { chapterId, slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix++;
  }
}

export async function createSubtopic(formData: FormData) {
  await requireAdminUser();
  const chapterId = formData.get('chapterId') as string;
  const title = formData.get('title') as string;
  const slug = await uniqueSubtopicSlug(chapterId, title);
  await prisma.subtopic.create({
    data: {
      chapterId,
      title,
      slug,
      orderIndex: Number(formData.get('orderIndex') || 0),
      isPublished: formData.get('isPublished') === 'on',
    },
  });
  revalidatePath('/admin/subtopics');
}

export async function updateSubtopic(formData: FormData) {
  await requireAdminUser();
  const id = formData.get('id') as string;
  const chapterId = formData.get('chapterId') as string;
  const title = formData.get('title') as string;
  const slug = await uniqueSubtopicSlug(chapterId, title, id);
  await prisma.subtopic.update({
    where: { id },
    data: {
      title,
      slug,
      orderIndex: Number(formData.get('orderIndex') || 0),
      isPublished: formData.get('isPublished') === 'on',
    },
  });
  revalidatePath('/admin/subtopics');
}

export async function deleteSubtopic(formData: FormData) {
  await requireAdminUser();
  await prisma.subtopic.delete({
    where: { id: formData.get('id') as string },
  });
  revalidatePath('/admin/subtopics');
}
