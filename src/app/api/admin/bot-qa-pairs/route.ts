import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const botType = searchParams.get('botType') ?? 'public';

    const pairs = await prisma.botQAPair.findMany({
      where: { botType },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: { pairs } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    return NextResponse.json({ success: false, error: { message: 'Failed' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json();
    const botType = (body.botType as string | undefined)?.trim();
    const question = (body.question as string | undefined)?.trim();
    const answer = (body.answer as string | undefined)?.trim();

    if (!botType || !question || !answer) {
      return NextResponse.json({ success: false, error: { message: 'botType, question and answer required' } }, { status: 400 });
    }

    const pair = await prisma.botQAPair.create({
      data: { botType, question, answer },
    });
    return NextResponse.json({ success: true, data: { pair } });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    return NextResponse.json({ success: false, error: { message: 'Failed' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: { message: 'id required' } }, { status: 400 });

    await prisma.botQAPair.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    return NextResponse.json({ success: false, error: { message: 'Failed' } }, { status: 500 });
  }
}
