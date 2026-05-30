import { Bot, BookOpen, Zap } from 'lucide-react';
import { PdfUploadSection } from '@/components/admin/PdfUploadSection';
import { SyncKnowledgeButton } from '@/components/admin/SyncKnowledgeButton';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [noteCount, chunkResult] = await Promise.all([
      prisma.note.count({ where: { isPublished: true, isDeleted: false } }),
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM knowledge_chunks`,
    ]);
    return { noteCount, chunkCount: Number(chunkResult[0]?.count ?? 0) };
  } catch {
    return { noteCount: 0, chunkCount: 0 };
  }
}

export default async function ChatbotTrainingPage() {
  const { noteCount, chunkCount } = await getStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-900">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Chatbot Training</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Train the Chartix AI chatbot with your notes and CMT curriculum PDFs. The chatbot uses this knowledge to answer student questions accurately.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Published Notes</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{noteCount}</p>
          <p className="mt-1 text-xs text-zinc-500">Synced notes feed directly into the chatbot</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">AI Knowledge Chunks</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{chunkCount}</p>
          <p className="mt-1 text-xs text-zinc-500">Total indexed pieces of knowledge</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Model</p>
          <p className="mt-2 text-xl font-bold text-zinc-950">GPT-4o</p>
          <p className="mt-1 text-xs text-zinc-500">With RAG — answers grounded in your material</p>
        </div>
      </div>

      {/* Step 1 — Sync Notes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            <Zap className="h-4 w-4 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Step 1 — Sync Study Notes</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Whenever you add or update notes in the Notes section, click this to re-train the chatbot with the latest content. Do this after every batch of note edits.
            </p>
          </div>
        </div>
        <SyncKnowledgeButton />
      </div>

      {/* Step 2 — Upload PDFs */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            <BookOpen className="h-4 w-4 text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Step 2 — Upload CMT Curriculum PDFs</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Upload official CMT books, curriculum PDFs, or any study material (up to 10 at a time). The chatbot will use these as its primary knowledge source.
            </p>
          </div>
        </div>
        <PdfUploadSection />
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">How it works</p>
        <ol className="space-y-2 text-xs text-zinc-600 list-decimal list-inside">
          <li>You add notes or upload PDFs → the chatbot reads and indexes all the content</li>
          <li>When a student asks a question, the chatbot finds the most relevant chunks from your material</li>
          <li>GPT-4o answers using your content as the primary source — not just general AI knowledge</li>
          <li>Sync notes regularly. Re-upload PDFs only when you have new material (already uploaded PDFs stay trained)</li>
        </ol>
      </div>
    </div>
  );
}
