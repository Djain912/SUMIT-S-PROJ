import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']),
});

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input' } },
        { status: 400 },
      );
    }

    const { id, status } = parsed.data;

    await prisma.contactSubmission.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 },
      );
    }
    console.error('[admin/contacts] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong' } },
      { status: 500 },
    );
  }
}
