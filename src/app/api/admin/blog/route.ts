import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { resend, FROM_EMAIL } from '@/lib/email/resend';

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

async function notifySubscribers(post: { title: string; slug: string; excerpt: string }) {
  try {
    const subscribers = await prisma.blogSubscriber.findMany({
      select: { email: true, unsubscribeToken: true },
    });
    if (!subscribers.length) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chartix.in';
    const postUrl = `${baseUrl}/blog/${post.slug}`;

    await Promise.allSettled(
      subscribers.map(({ email, unsubscribeToken }) =>
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `New post: ${post.title}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#064e3b;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Chartix</p>
          <p style="margin:4px 0 0;color:#6ee7b7;font-size:12px;">CMT Exam Prep Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">New Blog Post</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${post.title}</h1>
          ${post.excerpt ? `<p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">${post.excerpt}</p>` : ''}
          <a href="${postUrl}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Read the post →</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You're receiving this because you subscribed to Chartix blog updates.<br>
            <a href="${baseUrl}/api/blog/unsubscribe?token=${unsubscribeToken}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
      )
    );
    console.log(`[blog] Notified ${subscribers.length} subscriber(s) about "${post.title}"`);
  } catch (err) {
    console.error('[blog] notifySubscribers failed:', err);
  }
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

    if (isPublished) {
      void notifySubscribers({ title: post.title, slug: post.slug, excerpt: post.excerpt });
    }

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

    // Notify subscribers only on the first-ever publish (draft → live)
    if (!wasPublished && nowPublished) {
      void notifySubscribers({ title: post.title, slug: post.slug, excerpt: post.excerpt });
    }

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
