import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { AppNavbar } from '@/components/shared/app-navbar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try {
    const user = await requireAuthenticatedUser();
    
    // No navbar for admin users - they have their own sidebar with logout
    if (user.role === 'ADMIN') {
      return <>{children}</>;
    }
    
    return (
      <>
        <AppNavbar />
        {children}
      </>
    );
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/sign-in');
    }

    throw error;
  }
}
