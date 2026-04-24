import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AuthError, requireAdminUser } from '@/server/policies/auth';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/admin/login');
    }
    throw error;
  }

  return <AdminShell>{children}</AdminShell>;
}
