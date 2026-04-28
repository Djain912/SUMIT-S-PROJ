'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/server/policies/auth';

export async function createSubtopic(formData: FormData) {
  await requireAdminUser();
  await prisma.subtopic.create({
    data: {
      chapterId: formData.get('chapterId') as string,
      title: formData.get('title') as string,
      subtopicNo: Number(formData.get('subtopicNo') || 0),
      isPublished: formData.get('isPublished') === 'on',
    },
  });
  revalidatePath('/admin/subtopics');
}

export async function updateSubtopic(formData: FormData) {
  await requireAdminUser();
  await prisma.subtopic.update({
    where: { id: formData.get('id') as string },
    data: {
      title: formData.get('title') as string,
      subtopicNo: Number(formData.get('subtopicNo') || 0),
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
