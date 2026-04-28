'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/server/policies/auth';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

export async function createChapter(formData: FormData) {
  await requireAdminUser();
  const level = formData.get('level') as Level;
  await prisma.chapter.create({
    data: {
      level,
      title: formData.get('title') as string,
      chapterNo: Number(formData.get('chapterNo') || 0),
      isPublished: formData.get('isPublished') === 'on',
    },
  });
  revalidatePath('/admin/chapters');
}

export async function updateChapter(formData: FormData) {
  await requireAdminUser();
  await prisma.chapter.update({
    where: { id: formData.get('id') as string },
    data: {
      title: formData.get('title') as string,
      chapterNo: Number(formData.get('chapterNo') || 0),
      isPublished: formData.get('isPublished') === 'on',
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
