import { prisma } from '@/lib/db/prisma';
import { ContactsTable } from '@/components/admin/ContactsTable';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact Messages | Chartix Admin' };

export default async function AdminContactsPage() {
  const submissions = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const items = submissions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: undefined,
  }));

  return <ContactsTable initialItems={items} />;
}
