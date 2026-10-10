import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

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

  // Unread/pending counts for the sidebar badges. Fail-soft: a DB hiccup must
  // never block the admin area.
  let badges: Record<string, number> = {};
  try {
    const [questionReports, noteReports, contacts] = await Promise.all([
      prisma.questionReport.count({ where: { status: 'PENDING' } }),
      prisma.noteReport.count({ where: { status: 'PENDING' } }),
      prisma.contactSubmission.count({ where: { status: 'NEW' } }),
    ]);
    badges = {
      '/admin/question-reports': questionReports,
      '/admin/note-reports': noteReports,
      '/admin/contacts': contacts,
    };
  } catch (err) {
    console.error('[admin-layout] badge counts failed:', err);
  }

  return <AdminShell badges={badges}>{children}</AdminShell>;
}
