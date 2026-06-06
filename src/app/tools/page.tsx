import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowRight, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free CMT Indicator Lab | Interactive Technical Analysis Tools — Chartix',
  description: 'Free interactive calculators for every major CMT indicator — RSI, MACD, Stochastics, ADL, OBV, CMF and more. Live chart + step-by-step calculations. No login required.',
};

const TOOLS = [
  { key: 'rsi',         name: 'RSI',                        desc: 'Compares average gains to average losses on a 0–100 scale.',          tag: 'Momentum'   },
  { key: 'macd',        name: 'MACD',                       desc: 'Momentum from the gap between a fast and slow EMA.',                  tag: 'Momentum'   },
  { key: 'roc',         name: 'Rate of Change (ROC)',        desc: '% price change vs n bars ago — the simplest momentum measure.',       tag: 'Momentum'   },
  { key: 'stochastics', name: 'Stochastics',                 desc: 'Where the close sits within the recent high-low range (%K / %D).',   tag: 'Momentum'   },
  { key: 'ppo',         name: 'PPO',                        desc: 'MACD expressed as a %, comparable across any price level.',           tag: 'Momentum'   },
  { key: 'adl',         name: 'Accumulation / Distribution', desc: 'Volume weighted by close position — running buying/selling total.',   tag: 'Volume'     },
  { key: 'obv',         name: 'On Balance Volume (OBV)',     desc: 'Adds volume on up days, subtracts on down days. Granville\'s classic.',tag: 'Volume'    },
  { key: 'mfi',         name: 'Money Flow Index (MFI)',      desc: 'A volume-weighted RSI on a fixed 0–100 scale.',                      tag: 'Volume'     },
  { key: 'cmf',         name: 'Chaikin Money Flow (CMF)',    desc: 'Windowed ratio of money flow volume to total volume.',               tag: 'Volume'     },
  { key: 'rvol',        name: 'Relative Volume (RVOL)',      desc: 'Today\'s volume ÷ average volume. Confirms breakouts and climaxes.',  tag: 'Volume'     },
  { key: 'dmi',         name: 'DMI / ADX',                  desc: 'Trend direction (+DI/−DI) and trend strength (ADX) — Wilder.',       tag: 'Trend'      },
];

const TAG_COLORS: Record<string, string> = {
  Momentum: 'bg-blue-50 text-blue-700 border-blue-200',
  Volume:   'bg-purple-50 text-purple-700 border-purple-200',
  Trend:    'bg-amber-50 text-amber-700 border-amber-200',
};

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-emerald-900">Chartix</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden text-sm font-medium text-zinc-500 hover:text-emerald-700 transition sm:block">Log In</Link>
            <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
              Enroll Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-emerald-50 to-white py-14 sm:py-18">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-600">
              100% Free · No Login Required
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-emerald-900 sm:text-5xl">
              The CMT Indicator Lab
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-500 max-w-xl mx-auto">
              Build every major technical indicator yourself — interactive charts, step-by-step calculations, and clear explanations. Exactly how the CMT curriculum teaches it.
            </p>
          </div>
        </section>

        {/* Tool grid */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <Link key={t.key} href={`/tools/${t.key}`}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-800">{t.name}</h2>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TAG_COLORS[t.tag]}`}>{t.tag}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{t.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  Open tool <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-900 py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to go beyond the calculator?</h2>
            <p className="mt-3 text-sm text-emerald-300">
              Chartix has full CMT notes, 2000+ exam-level MCQs, mock tests and a CMT-trained AI tutor — for all three levels.
            </p>
            <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-900 hover:bg-emerald-50 transition">
              Start free — no card needed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Chartix · <Link href="/" className="hover:text-emerald-700">Home</Link> · <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link>
      </footer>
    </div>
  );
}
