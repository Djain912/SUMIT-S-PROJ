import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db/prisma';
import { TrendingUp, Clock, ArrowRight, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog | Chartix — CMT Exam Insights',
  description: 'CMT exam tips, technical analysis insights, and study strategies from Chartix.',
};

export const dynamic = 'force-dynamic';

async function getPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, publishedAt: true, readMinutes: true, tags: true },
      orderBy: { publishedAt: 'desc' },
    });
  } catch { return []; }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — matches main site */}
      <nav className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image src="/chartix-wordmark.png" alt="Chartix" width={132} height={34} priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium text-zinc-500 hover:text-emerald-700 transition">Sign in</Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-gradient-to-b from-emerald-50 to-white border-b border-emerald-100 py-14 sm:py-18 px-4 text-center">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Blog
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-emerald-900 sm:text-4xl">
          Technical Analysis Insights
        </h1>
        <p className="mt-3 mx-auto max-w-lg text-base text-zinc-500">
          Charts, patterns, indicators, and market concepts — explained clearly.
        </p>
      </section>

      {/* Posts */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-zinc-400 text-sm">No posts yet — check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-2xl border border-emerald-100 bg-white overflow-hidden shadow-sm transition hover:shadow-md hover:shadow-emerald-100 hover:-translate-y-0.5"
              >
                {/* Cover image */}
                {post.coverImageUrl ? (
                  <div className="h-44 overflow-hidden bg-emerald-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition group-hover:scale-105 duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-900">
                    <TrendingUp className="h-10 w-10 text-white/25" />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 className="font-bold text-zinc-900 leading-snug group-hover:text-emerald-700 transition line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm leading-6 text-zinc-500 line-clamp-3 flex-1">{post.excerpt}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      {post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readMinutes} min read
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-emerald-100 bg-gradient-to-b from-emerald-50 to-white py-14 text-center px-4">
        <p className="text-sm font-medium text-emerald-800">Ready to start your CMT preparation?</p>
        <p className="mt-1 text-xs text-zinc-500">Join students already studying smarter with Chartix.</p>
        <Link
          href="/sign-up"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Start free on Chartix <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-white py-6 text-center text-xs text-zinc-400">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
          <Link href="/pricing" className="hover:text-emerald-700 transition">Pricing</Link>
          <Link href="/privacy-policy" className="hover:text-emerald-700 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-emerald-700 transition">Terms</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
      </footer>
    </div>
  );
}
