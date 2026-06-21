'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/server/policies/auth';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueChapterSlug(level: Level, base: string, excludeId?: string): Promise<string> {
  const slug = toSlug(base) || 'chapter';
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.chapter.findFirst({
      where: { level, slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix++;
  }
}

export async function createChapter(formData: FormData) {
  await requireAdminUser();
  const level = formData.get('level') as Level;
  const title = formData.get('title') as string;
  const slug = await uniqueChapterSlug(level, title);
  await prisma.chapter.create({
    data: {
      level,
      title,
      slug,
      orderIndex: Number(formData.get('orderIndex') || 0),
      isPublished: formData.get('isPublished') === 'on',
      isTrialFree: formData.get('isTrialFree') === 'on',
    },
  });
  revalidatePath('/admin/chapters');
}

export async function updateChapter(formData: FormData) {
  await requireAdminUser();
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const level = formData.get('level') as Level;
  const slug = await uniqueChapterSlug(level, title, id);
  await prisma.chapter.update({
    where: { id },
    data: {
      title,
      slug,
      orderIndex: Number(formData.get('orderIndex') || 0),
      isPublished: formData.get('isPublished') === 'on',
      isTrialFree: formData.get('isTrialFree') === 'on',
    },
  });
  revalidatePath('/admin/chapters');
}

export async function deleteChapter(formData: FormData) {
  await requireAdminUser();
  await prisma.chapter.delete({
    where: { id: formData.get('id') as string },
  });
  revalidatePath('/admin/chapters');
}
