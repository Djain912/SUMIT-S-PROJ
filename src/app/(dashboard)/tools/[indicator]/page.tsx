import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requireAuthenticatedUser } from '@/server/policies/auth';
import { IndicatorTool, type IndicatorKey } from '@/components/tools/indicator-tool';

export const dynamic = 'force-dynamic';

const VALID: IndicatorKey[] = ['roc', 'macd', 'rsi', 'stochastics', 'adl', 'mfi', 'ppo', 'dmi', 'obv', 'cmf', 'rvol'];
const NAMES: Record<IndicatorKey, string> = {
  roc: 'Rate of Change', macd: 'MACD', rsi: 'RSI', stochastics: 'Stochastics',
  adl: 'Accumulation / Distribution', mfi: 'Money Flow Index', ppo: 'PPO', dmi: 'DMI (ADX)',
  obv: 'On Balance Volume', cmf: 'Chaikin Money Flow', rvol: 'Relative Volume',
};

export default async function IndicatorToolPage({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  if (!VALID.includes(indicator as IndicatorKey)) notFound();
  const key = indicator as IndicatorKey;

  const user = await requireAuthenticatedUser();
  const hasAccess = user.isPremium || user.role === 'ADMIN';

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        {hasAccess ? (
          <IndicatorTool indicator={key} />
        ) : (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <Lock className="h-6 w-6 text-emerald-700" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-zinc-900">{NAMES[key]} — Interactive Tool</h1>
            <p className="mt-2 text-sm text-zinc-600">
              This interactive calculator with live charts is a <span className="font-medium text-zinc-800">Premium</span> feature.
              Upgrade to explore the price chart, indicator plot and step-by-step calculation.
            </p>
            <Link href="/pricing" className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
              Upgrade to Premium
            </Link>
            <p className="mt-3">
              <Link href="/user/notes" className="text-xs text-zinc-500 underline">Back to notes</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
