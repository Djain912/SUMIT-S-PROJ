import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
