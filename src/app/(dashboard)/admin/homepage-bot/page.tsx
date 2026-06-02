import { Globe, MessageCircle, Zap } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { HomepageBotClient } from '@/components/admin/HomepageBotClient';

export const dynamic = 'force-dynamic';

async function getSources() {
  try {
    const sources = await prisma.publicBotSource.findMany({
      select: { id: true, type: true, name: true, charCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalChars = sources.reduce((sum, s) => sum + s.charCount, 0);
    return { sources, totalChars };
  } catch {
    return { sources: [], totalChars: 0 };
  }
}

export default async function HomepageBotPage() {
  const { sources, totalChars } = await getSources();
  const sourceCount = sources.length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Homepage Bot</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage the public CMT Exam Bot that appears on the homepage. Upload PDFs here — the bot learns exclusively from these documents using RAG (semantic search). Uses GPT-4o for accurate, context-aware answers.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Knowledge Sources</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{sourceCount}</p>
          <p className="mt-1 text-xs text-zinc-500">PDFs + URLs feeding the bot</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Total Context</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {totalChars >= 1000 ? `${(totalChars / 1000).toFixed(1)}k` : totalChars}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Characters of CMT knowledge</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Model</p>
          <p className="mt-2 text-xl font-bold text-zinc-950">GPT-4o</p>
          <p className="mt-1 text-xs text-zinc-500">20 messages / IP / hour rate limit</p>
        </div>
      </div>

      {/* Main client component */}
      <HomepageBotClient
        initialSources={sources.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
        initialTotalChars={totalChars}
      />

      {/* How it works */}
      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">How this bot works</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Globe,
              title: 'Feed it CMT info',
              body: 'Upload official curriculum PDFs and paste links to CMT blogs or the CMT Association website.',
            },
            {
              icon: MessageCircle,
              title: 'Visitors ask questions',
              body: 'Anyone on the homepage can ask about exam levels, fees, chapters, eligibility, and careers — no login needed.',
            },
            {
              icon: Zap,
              title: 'Bot redirects study questions',
              body: 'Concept questions like "Explain RSI" are politely declined with a nudge to sign up on Chartix.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200">
                  <Icon className="h-3.5 w-3.5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-700">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-5">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
