import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

function requireAdmin() {
  return auth().then((session) => {
    const user = session?.user as { role?: string } | undefined;
    if (!user || user.role !== 'ADMIN') return null;
    return session;
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// GET /api/admin/blog — list all posts (admin only)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const posts = await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        isPublished: true,
        publishedAt: true,
        readMinutes: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[blog GET]', err);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/admin/blog — create a new post
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, contentHtml, excerpt, coverImageUrl, isPublished, readMinutes, tags } = body;

    if (!title || !contentHtml) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let slug = slugify(title);

    // Ensure slug uniqueness
    const existing = await prisma.blogPost.findFirst({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        contentHtml,
        excerpt: excerpt?.trim() ?? '',
        coverImageUrl: coverImageUrl?.trim() || null,
        isPublished: !!isPublished,
        publishedAt: isPublished ? new Date() : null,
        readMinutes: parseInt(readMinutes) || 5,
        tags: Array.isArray(tags) ? tags : [],
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('[blog POST]', err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// PATCH /api/admin/blog?id=xxx — update a post
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json();
    const { title, contentHtml, excerpt, coverImageUrl, isPublished, readMinutes, tags } = body;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const wasPublished = existing.isPublished;
    const nowPublished = !!isPublished;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(contentHtml && { contentHtml }),
        excerpt: excerpt?.trim() ?? '',
        coverImageUrl: coverImageUrl?.trim() || null,
        isPublished: nowPublished,
        // Set publishedAt only when transitioning from draft → published
        publishedAt: !wasPublished && nowPublished ? new Date() : existing.publishedAt,
        ...(readMinutes && { readMinutes: parseInt(readMinutes) || 5 }),
        ...(Array.isArray(tags) && { tags }),
      },
    });

    return NextResponse.json({ post });
  } catch (err) {
    console.error('[blog PATCH]', err);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/blog?id=xxx — delete a post
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[blog DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
