'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

type UploadedPdf = {
  name: string;
  chunkCount: number;
  uploadedAt: string;
};

type UploadStatus = {
  status: 'idle' | 'uploading' | 'done' | 'error';
  message?: string;
  fileName?: string;
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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ status: 'idle' });
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
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

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({ status: 'error', message: 'Only PDF files are supported' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({ status: 'error', message: 'File is too large (max 50 MB)' });
      return;
    }

    setUploadStatus({ status: 'uploading', fileName: file.name });

    const form = new FormData();
    form.append('file', file);
    form.append('level', selectedLevel);

    try {
      const res = await fetch('/api/admin/knowledge/pdf', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadStatus({ status: 'error', message: data?.error?.message ?? 'Upload failed' });
        return;
      }

      setUploadStatus({
        status: 'done',
        message: `✓ ${data.data.fileName} — ${data.data.pageCount} pages, ${data.data.chunksCreated} knowledge chunks created`,
      });
      fetchPdfs();
    } catch {
      setUploadStatus({ status: 'error', message: 'Network error — please try again' });
    }
  }, [selectedLevel, fetchPdfs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Remove "${fileName}" from the AI knowledge base? The file itself won't be deleted, only the AI's memory of it.`)) return;
    setDeletingFile(fileName);
    try {
      const res = await fetch('/api/admin/knowledge/pdf', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      const data = await res.json();
      if (data.success) {
        setPdfs((prev) => prev.filter((p) => p.name !== fileName));
      }
    } finally {
      setDeletingFile(null);
    }
  };

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
            Upload CMT books, curriculum PDFs, or any study material. The AI will learn from them and answer student questions using this content.
          </p>
        </div>
      </div>

      {/* Level selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-700">Apply this PDF to:</label>
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
        onClick={() => uploadStatus.status !== 'uploading' && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          isDragging
            ? 'border-zinc-500 bg-zinc-100'
            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
        } ${uploadStatus.status === 'uploading' ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploadStatus.status === 'uploading'}
        />
        {uploadStatus.status === 'uploading' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
            <p className="mt-2 text-sm font-medium text-zinc-700">Processing {uploadStatus.fileName}…</p>
            <p className="mt-1 text-xs text-zinc-400">Reading PDF and creating AI knowledge chunks. This may take a minute for large files.</p>
          </>
        ) : (
          <>
            <Upload className="h-7 w-7 text-zinc-400" />
            <p className="mt-2 text-sm font-medium text-zinc-700">Drop a PDF here or click to upload</p>
            <p className="mt-1 text-xs text-zinc-400">CMT books, curriculum, study notes — max 50 MB</p>
          </>
        )}
      </div>

      {/* Upload result */}
      {uploadStatus.status === 'done' && uploadStatus.message && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-800">
          <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {uploadStatus.message}
        </div>
      )}
      {uploadStatus.status === 'error' && uploadStatus.message && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {uploadStatus.message}
        </div>
      )}

      {/* Uploaded PDFs list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Uploaded PDFs</p>
        {loadingList ? (
          <p className="text-xs text-zinc-400">Loading…</p>
        ) : pdfs.length === 0 ? (
          <p className="text-xs text-zinc-400">No PDFs uploaded yet. Upload your first book or curriculum above.</p>
        ) : (
          <ul className="space-y-2">
            {pdfs.map((pdf) => (
              <li key={pdf.name} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">{pdf.name}</p>
                    <p className="text-[10px] text-zinc-400">{pdf.chunkCount} knowledge chunks · {new Date(pdf.uploadedAt).toLocaleDateString()}</p>
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
