import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AuthError, requireAdminUser } from '@/server/policies/auth';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/sign-in');
    }
    throw error;
  }

  return <AdminShell>{children}</AdminShell>;
}
