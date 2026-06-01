import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { TrendingUp, Clock, Calendar, ArrowLeft, Tag } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
    });
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found | Chartix Blog' };
  return {
    title: `${post.title} | Chartix Blog`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-zinc-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-950">Chartix</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-sm text-zinc-500 hover:text-zinc-900 transition">← Blog</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Cover image */}
      {post.coverImageUrl && (
        <div className="h-64 sm:h-80 w-full overflow-hidden bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Article */}
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                <Tag className="h-3 w-3" /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-400 border-b border-zinc-100 pb-6">
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readMinutes} min read
          </span>
        </div>

        {/* Content */}
        <div
          className="mt-8 prose prose-zinc max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:leading-7 prose-p:text-zinc-700
            prose-a:text-zinc-900 prose-a:underline
            prose-ul:text-zinc-700 prose-ol:text-zinc-700
            prose-li:leading-7
            prose-strong:text-zinc-900
            prose-blockquote:border-l-zinc-300 prose-blockquote:text-zinc-600
            prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-zinc-950 prose-pre:text-zinc-100
            prose-img:rounded-xl prose-img:shadow-sm
            prose-hr:border-zinc-200"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>

      {/* CTA */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-12 text-center px-4">
        <p className="text-sm text-zinc-500">Ready to start your CMT preparation?</p>
        <Link href="/sign-up" className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700">
          Start free on Chartix →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white py-6 text-center text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-zinc-600">Home</Link>
          <Link href="/blog" className="hover:text-zinc-600">Blog</Link>
          <Link href="/pricing" className="hover:text-zinc-600">Pricing</Link>
          <Link href="/privacy-policy" className="hover:text-zinc-600">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-600">Terms</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
      </footer>
    </div>
  );
}
