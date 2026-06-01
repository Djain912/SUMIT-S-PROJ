"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Globe, Trash2, Upload, Plus, CheckCircle, AlertCircle, Loader2, Link2 } from 'lucide-react';

type Source = {
  id: string;
  type: string;
  name: string;
  charCount: number;
  createdAt: string;
};

type LoadState = 'idle' | 'loading' | 'success' | 'error';

function formatK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function shortName(name: string, maxLen = 48) {
  if (name.length <= maxLen) return name;
  return '…' + name.slice(-(maxLen - 1));
}

export function HomepageBotClient({ initialSources, initialTotalChars }: {
  initialSources: Source[];
  initialTotalChars: number;
}) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [totalChars, setTotalChars] = useState(initialTotalChars);

  // PDF upload state
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfState, setPdfState] = useState<LoadState>('idle');
  const [pdfMessage, setPdfMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlState, setUrlState] = useState<LoadState>('idle');
  const [urlMessage, setUrlMessage] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/public-bot-sources');
    const data = await res.json();
    if (data.success) {
      setSources(data.data.sources);
      setTotalChars(data.data.totalChars);
    }
  }, []);

  // Drag & drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf',
    );
    setPdfFiles((prev) => {
      const combined = [...prev, ...dropped];
      return combined.slice(0, 10);
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setPdfFiles((prev) => {
      const combined = [...prev, ...selected];
      return combined.slice(0, 10);
    });
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = (idx: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Upload PDFs
  const handleUploadPdfs = async () => {
    if (pdfFiles.length === 0 || pdfState === 'loading') return;
    setPdfState('loading');
    setPdfMessage('');

    try {
      const formData = new FormData();
      pdfFiles.forEach((f, i) => formData.append(`pdf_${i}`, f));

      const res = await fetch('/api/admin/public-bot-sources', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const added = data.data.added as number;
        setPdfState('success');
        setPdfMessage(`${added} PDF${added !== 1 ? 's' : ''} added successfully`);
        setPdfFiles([]);
        await reload();
        setTimeout(() => { setPdfState('idle'); setPdfMessage(''); }, 3000);
      } else {
        setPdfState('error');
        setPdfMessage(data.error?.message ?? 'Upload failed');
      }
    } catch {
      setPdfState('error');
      setPdfMessage('Network error — please try again');
    }
  };

  // Add URL
  const handleAddUrl = async () => {
    const url = urlInput.trim();
    if (!url || urlState === 'loading') return;
    setUrlState('loading');
    setUrlMessage('');

    try {
      const res = await fetch('/api/admin/public-bot-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (data.success) {
        setUrlState('success');
        setUrlMessage(`Added — ${formatK(data.data.charCount)} chars extracted`);
        setUrlInput('');
        await reload();
        setTimeout(() => { setUrlState('idle'); setUrlMessage(''); }, 3000);
      } else {
        setUrlState('error');
        setUrlMessage(data.error?.message ?? 'Failed to add URL');
      }
    } catch {
      setUrlState('error');
      setUrlMessage('Network error — please try again');
    }
  };

  // Delete a source
  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/public-bot-sources?id=${id}`, { method: 'DELETE' });
      await reload();
    } finally {
      setDeletingId(null);
    }
  };

  const contextPercent = Math.min(100, Math.round((totalChars / 60000) * 100));

  return (
    <div className="space-y-6">

      {/* Context meter */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-end justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Context Size</p>
          <p className="text-sm font-semibold text-zinc-700">{formatK(totalChars)} / 60k chars</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${contextPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {sources.length} source{sources.length !== 1 ? 's' : ''} · Bot uses up to 60k characters of context per conversation
        </p>
      </div>

      {/* Upload PDFs */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Add PDFs</p>
          <p className="text-xs text-zinc-500 mt-0.5">Upload CMT official curriculum PDFs or any CMT exam info documents (up to 10 at a time)</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
            isDragging ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          <Upload className="h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">Drop PDFs here or <span className="text-emerald-600">click to browse</span></p>
          <p className="text-xs text-zinc-400">Up to 10 PDFs · PDF files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>

        {/* Selected files list */}
        {pdfFiles.length > 0 && (
          <div className="space-y-1.5">
            {pdfFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span className="flex-1 min-w-0 truncate text-xs text-zinc-700">{f.name}</span>
                <span className="shrink-0 text-xs text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="ml-1 shrink-0 text-zinc-400 hover:text-red-500 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Status message */}
        {pdfMessage && (
          <div className={`flex items-center gap-2 text-xs ${pdfState === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {pdfState === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
            {pdfMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleUploadPdfs}
          disabled={pdfFiles.length === 0 || pdfState === 'loading'}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pdfState === 'loading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="h-4 w-4" /> Upload {pdfFiles.length > 0 ? `${pdfFiles.length} PDF${pdfFiles.length !== 1 ? 's' : ''}` : 'PDFs'}</>
          )}
        </button>
      </div>

      {/* Add URL */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Add URL</p>
          <p className="text-xs text-zinc-500 mt-0.5">Paste a link to a CMT blog, article, or official page — we fetch and extract the text automatically</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); }}
              placeholder="https://cmtassociation.org/..."
              disabled={urlState === 'loading'}
              className="w-full rounded-xl border border-zinc-200 pl-9 pr-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim() || urlState === 'loading'}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {urlState === 'loading' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Fetching…</>
            ) : (
              <><Plus className="h-4 w-4" /> Add</>
            )}
          </button>
        </div>

        {urlMessage && (
          <div className={`flex items-center gap-2 text-xs ${urlState === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {urlState === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
            {urlMessage}
          </div>
        )}
      </div>

      {/* Sources list */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-900">Knowledge Sources</p>
          <span className="text-xs text-zinc-500">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        </div>

        {sources.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-zinc-200 mb-3" />
            <p className="text-sm text-zinc-400">No sources added yet</p>
            <p className="text-xs text-zinc-300 mt-1">Upload PDFs or add URLs above to feed the bot</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  s.type === 'pdf' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  {s.type === 'pdf'
                    ? <FileText className="h-4 w-4 text-red-500" />
                    : <Globe className="h-4 w-4 text-blue-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate" title={s.name}>
                    {shortName(s.name)}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {s.type.toUpperCase()} · {formatK(s.charCount)} chars · {new Date(s.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                  title="Remove source"
                >
                  {deletingId === s.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
