'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function SyncKnowledgeButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ notesProcessed: number; chunksCreated: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSync = async () => {
    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data?.error?.message ?? 'Sync failed');
        setStatus('error');
        return;
      }

      setResult(data.data);
      setStatus('done');
    } catch {
      setErrorMsg('Network error — please try again');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        ) : (
          <Sparkles className="h-4 w-4 text-zinc-500" />
        )}
        {status === 'loading' ? 'Syncing AI Knowledge Base…' : 'Sync AI Knowledge Base'}
      </button>

      {status === 'done' && result && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          Synced {result.notesProcessed} notes → {result.chunksCreated} knowledge chunks created
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
