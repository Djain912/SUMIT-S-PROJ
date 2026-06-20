import { AdminSummaryClient } from '@/components/admin/admin-summary-client';

export default async function AdminSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const level = (params?.level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3') || 'LEVEL_1';
  return <AdminSummaryClient initialLevel={level} />;
}
