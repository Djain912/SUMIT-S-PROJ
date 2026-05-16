import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try {
    await requireAuthenticatedUser();
    return <>{children}</>;
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/sign-in');
    }
    throw error;
  }
}
