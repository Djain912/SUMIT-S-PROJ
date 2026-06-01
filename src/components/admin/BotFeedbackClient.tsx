"use client";

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Plus, Trash2, Loader2, MessageSquare, Globe, Bot, Pencil } from 'lucide-react';

type Feedback = {
  id: string;
  botType: string;
  question: string;
  answer: string;
  rating: string;
  userNote: string | null;
  createdAt: string;
};

type QAPair = {
  id: string;
  botType: string;
  question: string;
  answer: string;
  createdAt: string;
};

type Tab = 'feedback' | 'corrections';

function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function BotFeedbackClient({
  initialFeedback,
  initialQaPairs,
  likes,
  dislikes,
}: {
  initialFeedback: Feedback[];
  initialQaPairs: QAPair[];
  likes: number;
  dislikes: number;
}) {
  const [tab, setTab] = useState<Tab>('feedback');
  const [feedback] = useState<Feedback[]>(initialFeedback);
  const [qaPairs, setQaPairs] = useState<QAPair[]>(initialQaPairs);

  // Filter state
  const [botFilter, setBotFilter] = useState<'all' | 'public' | 'study'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'like' | 'dislike'>('all');

  // New Q&A form
  const [newBotType, setNewBotType] = useState<'public' | 'study'>('public');
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Expand/collapse feedback items
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFeedback = feedback.filter((f) => {
    if (botFilter !== 'all' && f.botType !== botFilter) return false;
    if (ratingFilter !== 'all' && f.rating !== ratingFilter) return false;
    return true;
  });

  async function addQAPair() {
    if (!newQ.trim() || !newA.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/bot-qa-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botType: newBotType, question: newQ.trim(), answer: newA.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setQaPairs((prev) => [data.data.pair, ...prev]);
        setNewQ('');
        setNewA('');
      }
    } finally {
      setAdding(false);
    }
  }

  async function deleteQAPair(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/bot-qa-pairs?id=${id}`, { method: 'DELETE' });
      setQaPairs((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // Pre-fill Q&A form from a disliked feedback item
  function useAsCorrection(f: Feedback) {
    setNewBotType(f.botType as 'public' | 'study');
    setNewQ(f.question);
    setNewA(f.userNote ?? '');
    setTab('corrections');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const total = likes + dislikes;
  const likeRate = total > 0 ? Math.round((likes / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Bot Feedback & Corrections</h1>
          <p className="mt-1 text-sm text-zinc-500">
            See what users liked or disliked, and write manual corrections that the bot will always use.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Total Feedback</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">👍 Likes</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{likes}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500">👎 Dislikes</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{dislikes}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Like Rate</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{likeRate}%</p>
          <p className="mt-1 text-xs text-zinc-400">Active corrections: {qaPairs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
        {([['feedback', 'User Feedback'], ['corrections', 'Bot Corrections']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {label}
            {key === 'feedback' && dislikes > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                {dislikes} 👎
              </span>
            )}
            {key === 'corrections' && qaPairs.length > 0 && (
              <span className="ml-2 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                {qaPairs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── FEEDBACK TAB ─────────────────────────────────────── */}
      {tab === 'feedback' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
              {(['all', 'dislike', 'like'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter(r)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    ratingFilter === r ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'like' ? '👍 Likes' : '👎 Dislikes'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
              {(['all', 'public', 'study'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBotFilter(b)}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                    botFilter === b ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {b === 'all' ? 'All bots' : b === 'public' ? <><Globe className="h-3 w-3" /> Homepage</> : <><Bot className="h-3 w-3" /> Study</>}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback list */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {filteredFeedback.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-zinc-200 mb-3" />
                <p className="text-sm text-zinc-400">No feedback yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {filteredFeedback.map((f) => (
                  <div key={f.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        f.rating === 'like' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {f.rating === 'like'
                          ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                          : <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            f.botType === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {f.botType === 'public' ? '🌐 Homepage' : '🎓 Study'}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(f.createdAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-700">
                          Q: {truncate(f.question, 100)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          A: {expandedId === f.id ? f.answer : truncate(f.answer)}
                          {f.answer.length > 120 && (
                            <button
                              onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                              className="ml-1 text-zinc-400 hover:text-zinc-600 underline"
                            >
                              {expandedId === f.id ? 'less' : 'more'}
                            </button>
                          )}
                        </p>
                        {f.userNote && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                            💬 User note: {f.userNote}
                          </p>
                        )}
                      </div>
                      {f.rating === 'dislike' && (
                        <button
                          onClick={() => useAsCorrection(f)}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50"
                          title="Write a correction for this response"
                        >
                          <Pencil className="h-3 w-3" /> Correct it
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CORRECTIONS TAB ──────────────────────────────────── */}
      {tab === 'corrections' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Add a Correction</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Write the question and the EXACT correct answer. The bot will always use this answer when asked something similar.
              </p>
            </div>

            {/* Bot type selector */}
            <div className="flex gap-2">
              {(['public', 'study'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setNewBotType(b)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    newBotType === b
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {b === 'public' ? <Globe className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  {b === 'public' ? 'Homepage Bot' : 'Study Bot'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700">Question (what user asks)</label>
              <input
                type="text"
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="e.g. How many questions are in CMT Level 1?"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700">Correct Answer</label>
              <textarea
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                placeholder="e.g. CMT Level 1 has 132 multiple-choice questions to be completed in 2 hours, with a passing score of approximately 70%."
                rows={3}
                className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>

            <button
              onClick={addQAPair}
              disabled={!newQ.trim() || !newA.trim() || adding}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Correction
            </button>
          </div>

          {/* Existing Q&A pairs */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <p className="text-sm font-semibold text-zinc-900">Active Corrections</p>
              <span className="text-xs text-zinc-400">{qaPairs.length} saved</span>
            </div>
            {qaPairs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Pencil className="mx-auto h-8 w-8 text-zinc-200 mb-3" />
                <p className="text-sm text-zinc-400">No corrections yet</p>
                <p className="text-xs text-zinc-300 mt-1">Add corrections above to fix wrong answers</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {qaPairs.map((p) => (
                  <div key={p.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p.botType === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {p.botType === 'public' ? '🌐 Homepage' : '🎓 Study'}
                        </span>
                        <span className="text-[10px] text-zinc-400">{new Date(p.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-700">Q: {p.question}</p>
                      <p className="text-xs text-zinc-500 leading-5">A: {p.answer}</p>
                    </div>
                    <button
                      onClick={() => deleteQAPair(p.id)}
                      disabled={deletingId === p.id}
                      className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                    >
                      {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-semibold text-zinc-500 mb-1.5">💡 How corrections work</p>
            <p className="text-xs text-zinc-400 leading-5">
              Every correction you save gets injected into the bot&apos;s system prompt as a <strong className="text-zinc-600">mandatory fact</strong>. The bot will always use your exact answer when asked something similar — even if its training data says otherwise. This is the most reliable way to fix wrong answers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
