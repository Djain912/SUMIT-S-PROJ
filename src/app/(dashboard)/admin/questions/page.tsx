import { AdminQuestionsClient } from '@/components/admin/admin-questions-client';

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const level = (params?.level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3') || 'LEVEL_1';

  return <AdminQuestionsClient initialLevel={level} />;
}