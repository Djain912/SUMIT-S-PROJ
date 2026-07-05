'use client';

import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';

type Subscriber = { email: string; subscribedAt: string };

export function BlogSubscribersPanel({ subscribers }: { subscribers: Subscriber[] }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(subscribers.map((s) => s.email).join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Mail className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Blog subscribers</h2>
            <p className="text-xs text-zinc-500">
              {subscribers.length} {subscribers.length === 1 ? 'person is' : 'people are'} notified by email
              when you publish a new post.
            </p>
          </div>
        </div>
        {subscribers.length > 0 && (
          <button
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy all emails'}
          </button>
        )}
      </div>

      {subscribers.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">
          No subscribers yet. They appear here when someone subscribes from the blog.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-zinc-50">
            {(open ? subscribers : subscribers.slice(0, 8)).map((s) => (
              <li key={s.email} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-sm text-zinc-800">{s.email}</span>
                <span className="text-xs text-zinc-400">
                  {new Date(s.subscribedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
          {subscribers.length > 8 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full border-t border-zinc-100 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              {open ? 'Show less' : `Show all ${subscribers.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
