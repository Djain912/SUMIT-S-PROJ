import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ScrollPopup } from '@/components/marketing/ScrollPopup';
import { LabHeader, LabFooter, LabCta } from '@/components/tools/lab-header';

export const metadata: Metadata = {
  title: 'Chartix Indicator Lab | Free Interactive Technical Analysis Tools',
  description:
    'Free interactive calculators for every major technical indicator — RSI, MACD, Stochastics, Bollinger Bands, moving averages, OBV, CMF and more. Live chart + step-by-step calculations. No login required.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Chartix Indicator Lab — Free Technical Analysis Calculators',
    description:
      'Interactive calculators for RSI, MACD, Bollinger Bands, Stochastics, OBV and 10+ more indicators. Free, no login.',
    url: '/tools',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chartix Indicator Lab — Free Technical Analysis Calculators',
    description: 'Interactive calculators for RSI, MACD, Bollinger Bands and 10+ more indicators.',
  },
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
  { key: 'bb',          name: 'Bollinger Bands®',            desc: 'A moving average wrapped by ±2 standard-deviation bands that expand and contract with volatility.', tag: 'Volatility' },
  { key: 'sma',         name: 'Simple MA (SMA)',             desc: 'Plain average of last n closes. The foundation of all MAs.',           tag: 'Moving Avg' },
  { key: 'ema',         name: 'Exponential MA (EMA)',        desc: 'Weights recent closes more. k = 2/(n+1). Reacts faster than SMA.',     tag: 'Moving Avg' },
  { key: 'lwma',        name: 'Linearly Weighted MA (LWMA)', desc: 'Linear weights 1…n. More responsive than SMA, less than EMA.',        tag: 'Moving Avg' },
  { key: 'wilderma',    name: 'Wilder MA (WSMA)',            desc: 'k = 1/n. Slower EMA. Used inside RSI, ADX and ATR.',                  tag: 'Moving Avg' },
  { key: 'distma',      name: 'Distance from MA (%)',        desc: '(Close − SMA) / SMA × 100. Shows how far price is from its trend.',   tag: 'Moving Avg' },
];

const GROUPS: { tag: string; title: string; note: string }[] = [
  { tag: 'Momentum',   title: 'Momentum',        note: 'How fast price is moving — and whether that speed is fading.' },
  { tag: 'Trend',      title: 'Trend',           note: 'Direction and strength of the prevailing move.' },
  { tag: 'Volume',     title: 'Volume',          note: 'Whether participation confirms what price is doing.' },
  { tag: 'Volatility', title: 'Volatility',      note: 'How wide price is swinging relative to its average.' },
  { tag: 'Moving Avg', title: 'Moving Averages', note: 'Smoothing price to reveal the underlying trend.' },
];

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-900">
      <LabHeader />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800">100% free · No login required</p>
          <h1 className="mt-5 max-w-3xl font-serif text-[44px] font-normal leading-[1.05] tracking-[-0.01em] text-stone-900 sm:text-[64px]">
            Chartix Indicator Lab
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-stone-500">
            Build every major technical indicator yourself — interactive charts, step-by-step calculations, and clear explanations. The best way to truly understand how each indicator works.
          </p>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-stone-200 pt-6 text-sm">
            {[['Indicators', String(TOOLS.length)], ['Families', String(GROUPS.length)], ['Price data', '5 years, daily']].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-400">{k}</dt>
                <dd className="mt-1 font-serif text-2xl text-stone-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
          {GROUPS.map((g) => {
            const items = TOOLS.filter((t) => t.tag === g.tag);
            return (
              <div key={g.tag} className="grid gap-6 border-t border-stone-200 py-10 lg:grid-cols-[280px_1fr] lg:gap-12">
                <div>
                  <h2 className="font-serif text-[28px] leading-tight text-stone-900">{g.title}</h2>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">{g.note}</p>
                  <p className="mt-3 text-xs text-stone-400">{items.length} {items.length === 1 ? 'indicator' : 'indicators'}</p>
                </div>
                <ul className="divide-y divide-stone-200 border-y border-stone-200 lg:border-t-0">
                  {items.map((t) => (
                    <li key={t.key}>
                      <Link href={`/tools/${t.key}`} className="group flex items-start justify-between gap-6 py-5 transition">
                        <div className="min-w-0">
                          <p className="text-[17px] font-medium text-stone-900 transition group-hover:text-emerald-800">{t.name}</p>
                          <p className="mt-1 text-sm leading-relaxed text-stone-500">{t.desc}</p>
                        </div>
                        <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-stone-200 text-stone-400 transition group-hover:border-emerald-800 group-hover:bg-emerald-800 group-hover:text-white">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <LabCta />
        </div>
      </main>

      <LabFooter />
      <ScrollPopup />
    </div>
  );
}
