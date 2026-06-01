"use client";

import { useState, useCallback } from 'react';
import { TinyMceEditor } from './tinymce-editor';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, X, Save,
  FileText, Calendar, Clock, Tag, Loader2, Globe, CheckCircle,
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  readMinutes: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialPosts: BlogPost[];
}

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  contentHtml: '',
  coverImageUrl: '',
  readMinutes: '5',
  tags: '',
  isPublished: false,
};

export function BlogAdminClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function openNew() {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    setView('editor');
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? '',
      contentHtml: post.contentHtml ?? '',
      coverImageUrl: post.coverImageUrl ?? '',
      readMinutes: String(post.readMinutes),
      tags: post.tags.join(', '),
      isPublished: post.isPublished,
    });
    setView('editor');
  }

  function cancelEditor() {
    setView('list');
    setEditingPost(null);
    setForm(EMPTY_FORM);
  }

  const handleContentChange = useCallback((html: string) => {
    setForm((prev) => ({ ...prev, contentHtml: html }));
  }, []);

  async function handleSave() {
    if (!form.title.trim()) { showToast('error', 'Title is required'); return; }
    if (!form.contentHtml.trim()) { showToast('error', 'Content cannot be empty'); return; }

    setIsSaving(true);
    try {
      const tagsArray = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: form.title.trim(),
        contentHtml: form.contentHtml,
        excerpt: form.excerpt.trim(),
        coverImageUrl: form.coverImageUrl.trim() || null,
        readMinutes: parseInt(form.readMinutes) || 5,
        tags: tagsArray,
        isPublished: form.isPublished,
      };

      if (editingPost) {
        const res = await fetch(`/api/admin/blog?id=${editingPost.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
        const data = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? data.post : p)));
        showToast('success', 'Post updated successfully');
      } else {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
        const data = await res.json();
        setPosts((prev) => [data.post, ...prev]);
        showToast('success', 'Post created successfully');
      }

      cancelEditor();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setPosts((prev) => prev.filter((p) => p.id !== id));
      showToast('success', 'Post deleted');
    } catch {
      showToast('error', 'Failed to delete post');
    } finally {
      setIsDeletingId(null);
      setDeleteId(null);
    }
  }

  async function handleTogglePublish(post: BlogPost) {
    try {
      const res = await fetch(`/api/admin/blog?id=${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !post.isPublished }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === post.id ? data.post : p)));
      showToast('success', data.post.isPublished ? 'Post published' : 'Post unpublished');
    } catch {
      showToast('error', 'Failed to update publish status');
    }
  }

  // ---- Editor View ----
  if (view === 'editor') {
    return (
      <div>
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={cancelEditor} className="text-sm text-zinc-400 hover:text-zinc-700 transition mb-1 flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <h2 className="text-xl font-bold text-zinc-950">
              {editingPost ? 'Edit Post' : 'New Post'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${form.isPublished ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                onClick={() => setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
              >
                <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-zinc-700">
                {form.isPublished ? 'Published' : 'Draft'}
              </span>
            </label>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving…' : 'Save Post'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Your blog post title…"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-lg font-semibold text-zinc-950 placeholder:text-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Content</label>
              <TinyMceEditor
                key={editingPost?.id ?? 'new'}
                initialValue={editingPost?.contentHtml ?? ''}
                onChange={handleContentChange}
                placeholder="Write your post here…"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Excerpt</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Short description shown in the blog list…"
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition resize-none"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Cover Image URL</label>
              <input
                type="url"
                value={form.coverImageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              />
              {form.coverImageUrl && (
                <div className="mt-3 h-32 rounded-lg overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.coverImageUrl} alt="Cover preview" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Read Time (minutes)</span>
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={form.readMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, readMinutes: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="CMT, Technical Analysis, Level 1"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
              />
              {form.tags && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- List View ----
  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-950">Delete this post?</h3>
            <p className="mt-2 text-sm text-zinc-500">This action cannot be undone. The post will be permanently removed.</p>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition">Cancel</button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={!!isDeletingId}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {isDeletingId === deleteId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Blog Posts</h2>
          <p className="text-sm text-zinc-500">{posts.length} post{posts.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-20 text-center">
          <FileText className="h-10 w-10 text-zinc-300 mb-4" />
          <p className="text-zinc-500 text-sm font-medium">No posts yet</p>
          <p className="text-zinc-400 text-xs mt-1">Click &quot;New Post&quot; to write your first blog post</p>
          <button onClick={openNew} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700">
            <Plus className="h-4 w-4" /> Write a post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
            >
              {/* Cover thumbnail */}
              <div className="shrink-0 h-16 w-20 rounded-lg overflow-hidden bg-zinc-100 flex items-center justify-center">
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-6 w-6 text-zinc-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-zinc-950 text-sm leading-snug">{post.title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${post.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {post.isPublished ? <><CheckCircle className="h-3 w-3" /> Published</> : 'Draft'}
                      </span>
                    </div>
                    {post.excerpt && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
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
                      {post.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {post.tags.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {post.isPublished && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700"
                        title="View live"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`rounded-lg border p-1.5 transition ${post.isPublished ? 'border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:border-zinc-300' : 'border-emerald-200 text-emerald-500 hover:border-emerald-300 hover:text-emerald-600'}`}
                      title={post.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {post.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => openEdit(post)}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-700"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(post.id)}
                      className="rounded-lg border border-red-100 p-1.5 text-red-400 transition hover:border-red-300 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

