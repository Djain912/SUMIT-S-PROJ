import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AdminLevelTabs } from '@/components/admin/admin-level-tabs';
import { ConfirmSubmitButton } from '@/components/shared/confirm-submit-button';
import { requireAdminUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';

type Level = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';

async function getChaptersWithSubtopics(level: Level) {
  return prisma.chapter.findMany({
    where: { level },
    orderBy: { chapterNo: 'asc' },
    include: {
      subtopics: {
        orderBy: { subtopicNo: 'asc' },
        include: {
          _count: {
            select: {
              notes: true,
              questions: true,
            },
          },
        },
      },
    },
  });
}

function getSelectedLevel(level?: string): Level {
  return ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(level ?? '') ? (level as Level) : 'LEVEL_1';
}

function formatLevel(level: Level) {
  return level.replace('_', ' ').replace('LEVEL', 'Level');
}

async function createSubtopicAction(formData: FormData) {
  'use server';
  await requireAdminUser();

  try {
    await prisma.subtopic.create({
      data: {
        chapterId: formData.get('chapterId') as string,
        title: formData.get('title') as string,
        subtopicNo: Number(formData.get('subtopicNo') || 0),
        isPublished: formData.get('isPublished') === 'on',
      },
    });
    revalidatePath('/admin/subtopics');
    redirect('/admin/subtopics?nocache=' + Date.now());
  } catch (error) {
    throw error;
  }
}

async function updateSubtopicAction(formData: FormData) {
  'use server';
  await requireAdminUser();

  try {
    await prisma.subtopic.update({
      where: { id: formData.get('id') as string },
      data: {
        title: formData.get('title') as string,
        subtopicNo: Number(formData.get('subtopicNo') || 0),
        isPublished: formData.get('isPublished') === 'on',
      },
    });
    revalidatePath('/admin/subtopics');
    redirect('/admin/subtopics?nocache=' + Date.now());
  } catch (error) {
    throw error;
  }
}

async function deleteSubtopicAction(formData: FormData) {
  'use server';
  await requireAdminUser();

  await prisma.subtopic.delete({
    where: { id: formData.get('id') as string },
  });
  revalidatePath('/admin/subtopics');
  redirect('/admin/subtopics?nocache=' + Date.now());
}

export default async function AdminSubtopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; error?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
  const selectedLevel = getSelectedLevel(params?.level);
  const errorMessage = typeof params?.error === 'string' ? params.error : null;
  const chapters = await getChaptersWithSubtopics(selectedLevel);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{formatLevel(selectedLevel)}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Subtopics</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Break chapters into focused study areas so notes and questions stay easy to find.
          </p>
          {errorMessage ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <AdminLevelTabs selectedLevel={selectedLevel} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-zinc-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-zinc-950">
            {formatLevel(selectedLevel)} chapter map
          </h2>
          <p className="text-sm text-zinc-500">{chapters.length} chapters</p>
        </div>

        <div className="p-4 sm:p-5">
          {chapters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-zinc-800">No chapters for this level</p>
              <p className="mt-1 text-sm text-zinc-500">Create chapters first, then add subtopics here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between bg-zinc-50 px-4 py-3">
                    <span className="font-semibold text-zinc-950">{chapter.title}</span>
                    <span className="text-xs text-zinc-500">
                      {chapter.subtopics.length} subtopics
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {chapter.subtopics.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-zinc-500">No subtopics yet</p>
                    ) : (
                      chapter.subtopics.map((subtopic) => (
                        <div key={subtopic.id} className="px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-950">{subtopic.title}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                Subtopic {subtopic.subtopicNo} - {subtopic._count.notes} notes - {subtopic._count.questions} questions
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              {subtopic.isPublished ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                  Published
                                </span>
                              ) : (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                                  Draft
                                </span>
                              )}
                              <form
                                action={deleteSubtopicAction}
                              >
                                <input type="hidden" name="id" value={subtopic.id} />
                                <ConfirmSubmitButton
                                  className="text-xs text-red-500 hover:text-red-700"
                                  message="Delete this subtopic?"
                                >
                                  Delete
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </div>

                          <details className="group mt-4 border-t border-zinc-100 pt-3">
                            <summary className="inline-flex cursor-pointer list-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                              <span className="group-open:hidden">Edit subtopic</span>
                              <span className="hidden group-open:inline">Close editor</span>
                            </summary>

                            <form action={updateSubtopicAction} className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                              <input type="hidden" name="id" value={subtopic.id} />
                              <input type="hidden" name="level" value={selectedLevel} />
                              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
                                <div>
                                  <label className="block text-sm font-medium text-zinc-700">Title</label>
                                  <input
                                    name="title"
                                    defaultValue={subtopic.title}
                                    required
                                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-zinc-700">Subtopic No.</label>
                                  <input
                                    name="subtopicNo"
                                    type="number"
                                    defaultValue={subtopic.subtopicNo}
                                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <label className="flex items-center gap-2 text-sm text-zinc-700">
                                  <input
                                    type="checkbox"
                                    name="isPublished"
                                    defaultChecked={subtopic.isPublished}
                                    className="rounded border-zinc-300"
                                  />
                                  Published
                                </label>
                                <button
                                  type="submit"
                                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                                >
                                  Save changes
                                </button>
                              </div>
                            </form>
                          </details>
                        </div>
                      ))
                    )}

                    <div className="px-4 py-3">
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-semibold text-zinc-800 hover:text-zinc-950">
                          + Add subtopic
                        </summary>
                        <form action={createSubtopicAction} className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                          <input type="hidden" name="chapterId" value={chapter.id} />
                          <input type="hidden" name="level" value={selectedLevel} />
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700">Title</label>
                              <input
                                name="title"
                                required
                                placeholder="Subtopic title"
                                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700">Subtopic No.</label>
                              <input
                                name="subtopicNo"
                                type="number"
                                placeholder="0"
                                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                              <input type="checkbox" name="isPublished" className="rounded border-zinc-300" />
                              Published
                            </label>
                            <button
                              type="submit"
                              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                            >
                              Add subtopic
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
