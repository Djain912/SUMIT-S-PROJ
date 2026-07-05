import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { BlogAdminClient } from '@/components/admin/BlogAdminClient';
import { BlogSubscribersPanel } from '@/components/admin/BlogSubscribersPanel';
import { FileText, Eye, EyeOff, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog | Admin — Chartix',
};

export const dynamic = 'force-dynamic';

async function getPosts() {
  try {
    return await prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        contentHtml: true,
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
  } catch { return []; }
}

async function getSubscribers() {
  try {
    return await prisma.blogSubscriber.findMany({
      select: { email: true, subscribedAt: true },
      orderBy: { subscribedAt: 'desc' },
    });
  } catch { return []; }
}

export default async function AdminBlogPage() {
  const [posts, subscribers] = await Promise.all([getPosts(), getSubscribers()]);

  const published = posts.filter((p) => p.isPublished).length;
  const drafts = posts.length - published;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Blog</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Write and manage CMT exam prep blog posts visible to the public.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <FileText className="mx-auto h-5 w-5 text-zinc-400 mb-2" />
          <p className="text-2xl font-bold text-zinc-950">{posts.length}</p>
          <p className="text-xs text-zinc-500">Total posts</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <Eye className="mx-auto h-5 w-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-emerald-700">{published}</p>
          <p className="text-xs text-emerald-600">Published</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
          <EyeOff className="mx-auto h-5 w-5 text-zinc-400 mb-2" />
          <p className="text-2xl font-bold text-zinc-700">{drafts}</p>
          <p className="text-xs text-zinc-500">Drafts</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <Mail className="mx-auto h-5 w-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-emerald-700">{subscribers.length}</p>
          <p className="text-xs text-emerald-600">Subscribers</p>
        </div>
      </div>

      {/* Client component */}
      <BlogAdminClient initialPosts={posts.map((p) => ({
        ...p,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))} />

      {/* Subscribers */}
      <BlogSubscribersPanel
        subscribers={subscribers.map((s) => ({
          email: s.email,
          subscribedAt: s.subscribedAt.toISOString(),
        }))}
      />
    </div>
  );
}
