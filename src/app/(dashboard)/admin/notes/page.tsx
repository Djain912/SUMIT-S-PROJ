import { AdminNotesClient } from '@/components/admin/admin-notes-client';

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const level = (params?.level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3') || 'LEVEL_1';

  return <AdminNotesClient initialLevel={level} />;
}