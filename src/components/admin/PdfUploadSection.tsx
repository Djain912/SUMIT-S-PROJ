'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle, BookOpen, X } from 'lucide-react';

type UploadedPdf = {
  name: string;
  chunkCount: number;
  uploadedAt: string;
};

type QueueItem = {
  file: File;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  message?: string;
};

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels (Global knowledge)' },
  { value: 'LEVEL_1', label: 'CMT Level 1 only' },
  { value: 'LEVEL_2', label: 'CMT Level 2 only' },
  { value: 'LEVEL_3', label: 'CMT Level 3 only' },
];

export function PdfUploadSection() {
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPdfs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/knowledge/pdf');
      const data = await res.json();
      if (data.success) setPdfs(data.data);
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchPdfs(); }, [fetchPdfs]);

  function addFilesToQueue(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid = arr
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .slice(0, 10);
    setQueue((prev) => {
      const combined = [...prev, ...valid.map((f): QueueItem => ({ file: f, status: 'waiting' }))];
      return combined.slice(0, 10);
    });
  }

  const uploadQueue = useCallback(async (currentQueue: QueueItem[], level: string) => {
    if (isUploading) return;
    setIsUploading(true);

    for (let i = 0; i < currentQueue.length; i++) {
      if (currentQueue[i].status !== 'waiting') continue;

      // Mark as uploading
      setQueue((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

      const form = new FormData();
      form.append('file', currentQueue[i].file);
      form.append('level', level);

      try {
        const res = await fetch('/api/admin/knowledge/pdf', { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setQueue((prev) => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', message: data?.error?.message ?? 'Upload failed' } : item
          ));
        } else {
          setQueue((prev) => prev.map((item, idx) =>
            idx === i ? {
              ...item, status: 'done',
              message: `${data.data.pageCount} pages · ${data.data.chunksCreated} AI chunks`
            } : item
          ));
        }
      } catch {
        setQueue((prev) => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', message: 'Network error' } : item
        ));
      }
    }

    setIsUploading(false);
    fetchPdfs();
  }, [isUploading, fetchPdfs]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFilesToQueue(e.dataTransfer.files);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Remove "${fileName}" from the AI knowledge base?`)) return;
    setDeletingFile(fileName);
    try {
      const res = await fetch('/api/admin/knowledge/pdf', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      const data = await res.json();
      if (data.success) setPdfs((prev) => prev.filter((p) => p.name !== fileName));
    } finally {
      setDeletingFile(null);
    }
  };

  const waitingCount = queue.filter((q) => q.status === 'waiting').length;
  const allDone = queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error');

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">PDF Knowledge Base</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Upload up to 10 PDFs at once. The chatbot will learn from them and answer student questions using this content.
          </p>
        </div>
      </div>

      {/* Level selector */}
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Apply PDFs to:</label>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
          isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
        } ${isUploading ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            addFilesToQueue(e.target.files ?? new FileList());
            e.target.value = '';
          }}
        />
        <Upload className="h-7 w-7 text-zinc-400" />
        <p className="mt-2 text-sm font-medium text-zinc-700">Drop PDFs here or click to select</p>
        <p className="mt-1 text-xs text-zinc-400">Select up to 10 PDFs at once · max 50 MB each</p>
      </div>

      {/* Queue list */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Upload Queue</p>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-[10px] text-zinc-400 hover:text-zinc-600"
              >
                Clear all
              </button>
            )}
          </div>

          <ul className="space-y-1.5">
            {queue.map((item, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                item.status === 'done' ? 'border-green-200 bg-green-50' :
                item.status === 'error' ? 'border-red-200 bg-red-50' :
                item.status === 'uploading' ? 'border-blue-200 bg-blue-50' :
                'border-zinc-200 bg-zinc-50'
              }`}>
                {item.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />}
                {item.status === 'done' && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                {item.status === 'error' && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                {item.status === 'waiting' && <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-800">{item.file.name}</p>
                  {item.message && <p className={`text-[10px] ${item.status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{item.message}</p>}
                  {item.status === 'uploading' && <p className="text-[10px] text-blue-600">Processing… this may take a minute</p>}
                  {item.status === 'waiting' && <p className="text-[10px] text-zinc-400">Waiting to upload</p>}
                </div>
                {item.status === 'waiting' && !isUploading && (
                  <button
                    type="button"
                    onClick={() => setQueue((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-zinc-400 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Upload button */}
          {waitingCount > 0 && !isUploading && (
            <button
              type="button"
              onClick={() => void uploadQueue(queue, selectedLevel)}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Upload {waitingCount} PDF{waitingCount > 1 ? 's' : ''} to Chatbot
            </button>
          )}
          {isUploading && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              <span className="text-sm text-zinc-600">Uploading and training… please wait</span>
            </div>
          )}
          {allDone && !isUploading && (
            <button
              type="button"
              onClick={() => setQueue([])}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
            >
              Clear and upload more
            </button>
          )}
        </div>
      )}

      {/* Uploaded PDFs list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Trained PDFs</p>
        {loadingList ? (
          <p className="text-xs text-zinc-400">Loading…</p>
        ) : pdfs.length === 0 ? (
          <p className="text-xs text-zinc-400">No PDFs uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {pdfs.map((pdf) => (
              <li key={pdf.name} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">{pdf.name}</p>
                    <p className="text-[10px] text-zinc-400">{pdf.chunkCount} AI chunks · {new Date(pdf.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pdf.name)}
                  disabled={deletingFile === pdf.name}
                  className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                >
                  {deletingFile === pdf.name
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
