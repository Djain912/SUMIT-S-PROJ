'use client';

import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, X, Send, Loader2, ChevronLeft } from 'lucide-react';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import {
  computeRsi, computeRoc, computeMacd, computeStochastics, computeMfi, computePpo,
  computeCmf, computeRvol, computeObv, computeAdl, computeDmi, computeDistMa,
  computeBollinger, computeSma, computeEma, computeLwma, computeWilderMa,
} from '@/lib/tools/indicators';
import { IndicatorTool, type IndicatorKey } from '@/components/tools/indicator-tool';
import { getEducation, type IndicatorEducation, type Tone, type SignalDef } from '@/lib/tools/indicator-education';

// ── Per-indicator primary value series for the live interpretation + signal engine ──
const CLOSES = AAPL_SAMPLE.map(b => b.close);
const compact = (n: number) => {
  const a = Math.abs(n);
  return a >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0);
};
// Indicators whose primary value does NOT depend on the period slider
export const FIXED_PARAM: IndicatorKey[] = ['macd', 'ppo', 'obv', 'adl'];

type Primary = { line: (number | null)[]; label: string; fmt: (n: number) => string };

// N-bar change of a (possibly cumulative) series
const deltaN = (line: (number | null)[], n: number): (number | null)[] =>
  line.map((_, i) => (i >= n && line[i] != null && line[i - n] != null ? (line[i] as number) - (line[i - n] as number) : null));

function getPrimary(key: IndicatorKey, period: number): Primary {
  const dec1 = (n: number) => n.toFixed(1);
  const pct2 = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  switch (key) {
    case 'rsi': return { line: computeRsi(AAPL_SAMPLE, period).line, label: `RSI(${period})`, fmt: dec1 };
    case 'roc': return { line: computeRoc(AAPL_SAMPLE, period).line, label: `ROC(${period})`, fmt: (n) => n.toFixed(2) + '%' };
    case 'macd': return { line: computeMacd(AAPL_SAMPLE, 12, 26, 9).macdLine, label: 'MACD(12,26,9)', fmt: (n) => n.toFixed(2) };
    case 'stochastics': return { line: computeStochastics(AAPL_SAMPLE, period).kLine, label: `%K(${period})`, fmt: dec1 };
    case 'mfi': return { line: computeMfi(AAPL_SAMPLE, period).line, label: `MFI(${period})`, fmt: dec1 };
    case 'ppo': return { line: computePpo(AAPL_SAMPLE, 12, 26, 9).ppoLine, label: 'PPO(12,26,9)', fmt: (n) => n.toFixed(2) + '%' };
    case 'cmf': return { line: computeCmf(AAPL_SAMPLE, period).line, label: `CMF(${period})`, fmt: (n) => n.toFixed(2) };
    case 'rvol': return { line: computeRvol(AAPL_SAMPLE, period).line, label: `RVOL(${period})`, fmt: (n) => n.toFixed(2) + '×' };
    // For cumulative lines, interpret the recent TREND (10-bar change), so the
    // band reads accumulation (rising) vs distribution (falling).
    case 'obv': return { line: deltaN(computeObv(AAPL_SAMPLE).line, 10), label: 'OBV 10-bar change', fmt: compact };
    case 'adl': return { line: deltaN(computeAdl(AAPL_SAMPLE).line, 10), label: 'ADL 10-bar change', fmt: compact };
    case 'dmi': return { line: computeDmi(AAPL_SAMPLE, period).adx, label: `ADX(${period})`, fmt: dec1 };
    case 'distma': return { line: computeDistMa(AAPL_SAMPLE, period).distLine, label: `Distance from SMA(${period})`, fmt: pct2 };
    case 'bb': return { line: computeBollinger(AAPL_SAMPLE, period, 2).rows.map(r => r.pctB), label: '%B', fmt: (n) => n.toFixed(0) + '%' };
    case 'sma': case 'ema': case 'lwma': case 'wilderma': {
      const ma = (key === 'sma' ? computeSma : key === 'ema' ? computeEma : key === 'lwma' ? computeLwma : computeWilderMa)(AAPL_SAMPLE, period).line;
      const dist = ma.map((m, i) => (m == null ? null : ((CLOSES[i] - m) / m) * 100));
      return { line: dist, label: `Price vs ${key.toUpperCase()}(${period})`, fmt: pct2 };
    }
    default: return { line: [], label: '', fmt: (n) => String(n) };
  }
}

// ── design primitives ──
const toneText: Record<Tone, string> = {
  bull: 'text-emerald-800', bear: 'text-rose-700', neutral: 'text-stone-700', caution: 'text-amber-700',
};
const toneDot: Record<Tone, string> = {
  bull: 'bg-emerald-600', bear: 'bg-rose-500', neutral: 'bg-stone-400', caution: 'bg-amber-500',
};

const PROSE = 'text-[15px] leading-[1.75] text-stone-600';

function Section({ id, n, title, lead, children }: {
  id: string; n: number; title: string; lead?: string; children: ReactNode;
}) {
  return (
    <section id={id} data-lab-section className="scroll-mt-32 border-t border-stone-200 pt-10 lg:scroll-mt-24">
      <p className="font-mono text-[11px] tracking-[0.14em] text-stone-400">{String(n).padStart(2, '0')}</p>
      <h2 className="mt-2 font-serif text-[30px] font-normal leading-tight tracking-[-0.005em] text-stone-900">{title}</h2>
      {lead && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-500">{lead}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400 ${className}`}>{children}</p>;
}

function Bullets({ items, tone = 'neutral' }: { items: string[]; tone?: 'emerald' | 'rose' | 'amber' | 'neutral' }) {
  const dot = { emerald: 'bg-emerald-600', rose: 'bg-rose-400', amber: 'bg-amber-500', neutral: 'bg-stone-300' }[tone];
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-[1.7] text-stone-600">
          <span className={`mt-[11px] h-1 w-1 flex-none rounded-full ${dot}`} /><span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Column with a coloured rule under its heading — used for paired lists.
function Column({ title, rule, children }: { title: string; rule: string; children: ReactNode }) {
  return (
    <div>
      <h3 className={`mb-5 border-b pb-3 text-[13px] font-semibold text-stone-900 ${rule}`}>{title}</h3>
      {children}
    </div>
  );
}

function FormulaBlock({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-stone-200 bg-[#F4F3EE] ${size === 'md' ? 'px-5 py-4' : 'px-4 py-3'}`}>
      <code className={`whitespace-nowrap font-mono text-stone-800 ${size === 'md' ? 'text-[14.5px]' : 'text-[13px]'}`}>{children}</code>
    </div>
  );
}

type CalloutKind = 'why' | 'pro' | 'trap' | 'exam';
const calloutCfg: Record<CalloutKind, { rule: string; label: string; text: string }> = {
  why: { rule: 'border-emerald-600', text: 'text-emerald-800', label: 'Why this matters' },
  pro: { rule: 'border-stone-400', text: 'text-stone-500', label: 'Professional insight' },
  trap: { rule: 'border-rose-400', text: 'text-rose-700', label: 'Common trap' },
  exam: { rule: 'border-amber-500', text: 'text-amber-700', label: 'Exam focus' },
};
function Callout({ kind, title, children }: { kind: CalloutKind; title?: string; children: ReactNode }) {
  const c = calloutCfg[kind];
  return (
    <div className={`border-l-2 ${c.rule} py-0.5 pl-4`}>
      <p className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] ${c.text}`}>{c.label}</p>
      {title && <p className="mt-1.5 text-[15px] font-medium text-stone-900">{title}</p>}
      <p className="mt-1 text-[14.5px] leading-[1.7] text-stone-600">{children}</p>
    </div>
  );
}

// ── signal detection helpers (RSI-style 0–100 oscillator) ──
type Detected = { present: boolean; date?: string; value?: number };

function lastWhere(line: (number | null)[], pred: (v: number) => boolean): number {
  for (let i = line.length - 1; i >= 0; i--) { const v = line[i]; if (v != null && pred(v)) return i; }
  return -1;
}
function lastCross(line: (number | null)[], level: number, up: boolean): number {
  for (let i = line.length - 1; i >= 1; i--) {
    const a = line[i - 1], b = line[i];
    if (a == null || b == null) continue;
    if (up && a < level && b >= level) return i;
    if (!up && a >= level && b < level) return i;
  }
  return -1;
}
// simple swing-point finder: local extreme over ±w bars
function swings(vals: number[], w: number, max: boolean): number[] {
  const out: number[] = [];
  for (let i = w; i < vals.length - w; i++) {
    let ext = true;
    for (let j = i - w; j <= i + w; j++) { if (j === i) continue; if (max ? vals[j] > vals[i] : vals[j] < vals[i]) { ext = false; break; } }
    if (ext) out.push(i);
  }
  return out;
}
function lastValid(line: (number | null)[]): number { let i = line.length - 1; while (i >= 0 && line[i] == null) i--; return i; }
function trendDetect(line: (number | null)[], up: boolean): Detected {
  const li = lastValid(line); if (li < 0) return { present: false };
  let pi = li - 10; while (pi >= 0 && line[pi] == null) pi--; if (pi < 0) return { present: false };
  const rising = (line[li] as number) > (line[pi] as number);
  return (up ? rising : !rising) ? { present: true, date: AAPL_SAMPLE[li].date, value: line[li] as number } : { present: false };
}
function divergenceDetect(line: (number | null)[], bear: boolean): Detected {
  const start = Math.max(0, line.length - 60);
  const pts = swings(CLOSES, 3, bear).filter(i => i >= start && line[i] != null);
  if (pts.length < 2) return { present: false };
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const priceCond = bear ? CLOSES[b] > CLOSES[a] : CLOSES[b] < CLOSES[a];
  const indCond = bear ? (line[b] as number) < (line[a] as number) : (line[b] as number) > (line[a] as number);
  return priceCond && indCond ? { present: true, date: AAPL_SAMPLE[b].date, value: line[b] as number } : { present: false };
}
function runDetector(sig: SignalDef, line: (number | null)[]): Detected {
  const at = (i: number): Detected => i < 0 ? { present: false } : { present: true, date: AAPL_SAMPLE[i].date, value: line[i] as number };
  const lv = sig.level ?? 0;
  switch (sig.type) {
    case 'above': return at(lastWhere(line, v => v >= lv));
    case 'below': return at(lastWhere(line, v => v <= lv));
    case 'cross_above': return at(lastCross(line, lv, true));
    case 'cross_below': return at(lastCross(line, lv, false));
    case 'rising': return trendDetect(line, true);
    case 'falling': return trendDetect(line, false);
    case 'bullish_divergence': return divergenceDetect(line, false);
    case 'bearish_divergence': return divergenceDetect(line, true);
    default: return { present: false };
  }
}

export function IndicatorLab({ indicator, intro }: { indicator: IndicatorKey; intro?: string }) {
  const edu = getEducation(indicator);

  // Indicators without published education content fall back to the classic tool.
  if (!edu) return <IndicatorTool indicator={indicator} />;
  return <Lab edu={edu} indicator={indicator} intro={intro} />;
}

const TOC: [string, string][] = [
  ['overview', 'Overview'], ['chart', 'Live chart'], ['calc', 'How it’s calculated'], ['reading', 'Reading it today'],
  ['signals', 'Signals'], ['thinks', 'How it thinks'], ['env', 'When it works'], ['mistakes', 'Common mistakes'],
  ['related', 'Related indicators'], ['cmt', 'CMT exam corner'], ['practice', 'Practice'], ['tutor', 'Ask Chartix Scholar'],
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map(id => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    els.forEach(e => obs.observe(e));
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

const TOC_IDS = TOC.map(([id]) => id);

function Lab({ edu, indicator, intro }: { edu: IndicatorEducation; indicator: IndicatorKey; intro?: string }) {
  const [period, setPeriod] = useState(14);
  const active = useActiveSection(TOC_IDS);
  const mobileNavRef = useRef<HTMLElement | null>(null);

  const usesPeriod = !FIXED_PARAM.includes(indicator);

  const { line, label, fmt, latest, latestDate } = useMemo(() => {
    const p = getPrimary(indicator, period);
    const li = lastValid(p.line);
    return { ...p, latest: li >= 0 ? (p.line[li] as number) : null, latestDate: li >= 0 ? AAPL_SAMPLE[li].date : '' };
  }, [indicator, period]);

  const band = useMemo(() => {
    if (latest == null) return null;
    return edu.interpretation.bands.find(b =>
      (b.min == null || latest >= b.min) && (b.max == null || latest <= b.max)) ?? null;
  }, [latest, edu]);

  const detections = useMemo(() => edu.signals.map(sig => runDetector(sig, line)), [line, edu]);

  // keep the active pill visible in the mobile nav
  useEffect(() => {
    const el = mobileNavRef.current?.querySelector<HTMLElement>(`[data-toc="${active}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  return (
    <div>
      {/* Hero */}
      <header className="pb-12">
        <Link href="/tools" className="inline-flex items-center gap-1 text-[13px] text-stone-500 transition hover:text-stone-900 sm:hidden">
          <ChevronLeft className="h-3.5 w-3.5" /> Indicator Lab
        </Link>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800 sm:mt-0">
          Free calculator &amp; study guide · {edu.snapshot.difficulty}
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.01em] text-stone-900 sm:text-[56px]">
          {edu.name}
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-stone-500">{edu.tagline}</p>

        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-stone-200 py-6 lg:grid-cols-4">
          {([
            ['Category', edu.snapshot.category],
            ['Created by', edu.snapshot.creator],
            ['Level', edu.snapshot.difficulty],
            ['Works best in', edu.snapshot.marketType],
          ] as const).map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-400">{k}</dt>
              <dd className="mt-1.5 text-[14px] leading-snug text-stone-800">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Mobile section nav */}
      <nav ref={mobileNavRef} className="sticky top-14 z-30 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-stone-200 bg-[#FAFAF8]/95 px-4 py-2.5 backdrop-blur [scrollbar-width:none] lg:hidden">
        {TOC.map(([id, l]) => (
          <a key={id} href={`#${id}`} data-toc={id}
            className={`flex-none rounded-full px-3 py-1 text-[13px] transition ${active === id ? 'bg-stone-900/[0.06] text-stone-900' : 'text-stone-500'}`}>{l}</a>
        ))}
      </nav>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16">
        {/* Desktop contents */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24">
            <Label className="mb-4">On this page</Label>
            <ol className="space-y-0.5 border-l border-stone-200">
              {TOC.map(([id, l]) => (
                <li key={id}>
                  <a href={`#${id}`}
                    className={`-ml-px block border-l py-1.5 pl-4 text-[13.5px] transition ${active === id ? 'border-emerald-800 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
                    {l}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-20">
          {/* 01 Overview */}
          <Section id="overview" n={1} title="Overview">
            <p className="max-w-2xl font-serif text-[21px] leading-[1.55] text-stone-800">{edu.snapshot.primaryPurpose}</p>
            <div className="mt-8">
              <Label className="mb-2.5">Formula</Label>
              <FormulaBlock>{edu.snapshot.formula}</FormulaBlock>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {([['The problem it solves', edu.whyExists.problem], ['Historical context', edu.whyExists.history], ['Practical use case', edu.whyExists.useCase]] as const).map(([h, b]) => (
                <div key={h}>
                  <h3 className="text-[13px] font-semibold text-stone-900">{h}</h3>
                  <p className={`mt-2 ${PROSE}`}>{b}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 02 Live chart */}
          <Section id="chart" n={2} title="Live chart"
            lead={intro ?? 'Adjust the settings and watch the indicator recalculate on five years of real daily price data.'}>
            <IndicatorTool indicator={indicator} embedded />
          </Section>

          {/* 03 Calculation */}
          <Section id="calc" n={3} title="How it’s calculated" lead="Every step, in the order the indicator is built.">
            <ol className="space-y-10">
              {edu.calcSteps.map((s, i) => (
                <li key={i} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 sm:grid-cols-[48px_minmax(0,1fr)]">
                  <span className="font-serif text-[32px] leading-none text-emerald-800/80">{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-stone-900">{s.title}</h3>
                    <p className={`mt-1.5 ${PROSE}`}>{s.detail}</p>
                    {s.formula && <div className="mt-4"><FormulaBlock size="sm">{s.formula}</FormulaBlock></div>}
                    {s.whyMatters && <div className="mt-5"><Callout kind="why">{s.whyMatters}</Callout></div>}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 04 Reading it today */}
          <Section id="reading" n={4} title="Reading it today" lead="A plain-English read of the latest value on the sample chart.">
            <div className="rounded-2xl border border-stone-200 bg-white">
              <div className="flex flex-wrap items-end justify-between gap-6 px-6 pb-6 pt-6">
                <div>
                  <Label>{label}</Label>
                  <p className="mt-2 font-serif text-[52px] leading-none text-stone-900">{latest != null ? fmt(latest) : '—'}</p>
                  {latestDate && <p className="mt-2 text-xs text-stone-400">As of {latestDate} · AAPL daily</p>}
                </div>
                {usesPeriod && (
                  <div className="w-full max-w-[260px]">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>Lookback period</span><span className="font-mono text-stone-900">{period}</span>
                    </div>
                    <input type="range" min={7} max={26} value={period} onChange={e => setPeriod(parseInt(e.target.value, 10))}
                      className="mt-2 w-full accent-emerald-800" aria-label="Lookback period" />
                  </div>
                )}
              </div>
              {band && (
                <div className="border-t border-stone-200 px-6 py-5">
                  <p className={`flex items-center gap-2 text-[15px] font-semibold ${toneText[band.tone]}`}>
                    <span className={`h-2 w-2 rounded-full ${toneDot[band.tone]}`} /> {band.label}
                  </p>
                  <p className={`mt-1.5 ${PROSE}`}>{band.message}</p>
                </div>
              )}
            </div>
            <div className="mt-8"><Callout kind="pro">{edu.interpretation.note}</Callout></div>
          </Section>

          {/* 05 Signals */}
          <Section id="signals" n={5} title="Signals" lead="What has fired on the sample chart, why it matters, and how much to trust it.">
            <ul className="divide-y divide-stone-200 border-y border-stone-200">
              {edu.signals.map((sig, si) => {
                const d = detections[si];
                return (
                  <li key={si} className="grid gap-3 py-6 sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-8">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-stone-900">{sig.name}</h3>
                      <p className={`mt-1.5 ${PROSE}`}>{sig.why}</p>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-stone-500"><span className="font-medium text-stone-700">Reliability — </span>{sig.reliability}</p>
                    </div>
                    <div className="sm:text-right">
                      {d?.present
                        ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Detected{d.date ? <span className="font-normal text-stone-500">· {d.date}</span> : null}</span>
                        : <span className="inline-flex items-center gap-1.5 text-[13px] text-stone-400"><span className="h-1.5 w-1.5 rounded-full bg-stone-300" />Not present</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* 06 How it thinks */}
          <Section id="thinks" n={6} title="How it thinks" lead="What it sees — and what it can’t.">
            <div className="grid gap-10 md:grid-cols-2">
              <Column title="What it measures" rule="border-emerald-700/60"><Bullets items={edu.howItThinks.measures} tone="emerald" /></Column>
              <Column title="What it ignores" rule="border-rose-400/70"><Bullets items={edu.howItThinks.ignores} tone="rose" /></Column>
            </div>
            {edu.proInsights.length > 0 && (
              <div className="mt-14">
                <h3 className="font-serif text-[22px] text-stone-900">How professionals actually use it</h3>
                <div className="mt-6 grid gap-8 md:grid-cols-3">
                  {edu.proInsights.map((p, i) => (
                    <div key={i} className="border-t border-stone-200 pt-5">
                      <p className="font-mono text-[11px] text-stone-400">{String(i + 1).padStart(2, '0')}</p>
                      <p className="mt-2 text-[15px] font-semibold text-stone-900">{p.title}</p>
                      <p className="mt-2 text-[14.5px] leading-[1.7] text-stone-600">{p.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 07 Market environment */}
          <Section id="env" n={7} title="When it works" lead="Where it shines and where it breaks.">
            <div className="grid gap-10 md:grid-cols-3">
              <Column title="Best conditions" rule="border-emerald-700/60"><Bullets items={edu.marketEnvironment.best} tone="emerald" /></Column>
              <Column title="Worst conditions" rule="border-amber-500/70"><Bullets items={edu.marketEnvironment.worst} tone="amber" /></Column>
              <Column title="Common failures" rule="border-rose-400/70"><Bullets items={edu.marketEnvironment.failures} tone="rose" /></Column>
            </div>
          </Section>

          {/* 08 Mistakes */}
          <Section id="mistakes" n={8} title="Common mistakes" lead="Beginner traps, and how professionals read the same thing.">
            <div className="grid gap-10 md:grid-cols-2">
              <Column title="Beginner mistakes" rule="border-rose-400/70"><Bullets items={edu.mistakes.beginner} tone="rose" /></Column>
              <Column title="How professionals read it" rule="border-emerald-700/60"><Bullets items={edu.mistakes.professional} tone="emerald" /></Column>
            </div>
          </Section>

          {/* 09 Related + compare */}
          <Section id="related" n={9} title="Related indicators" lead="Siblings, partners, and how they differ.">
            <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <Label className="mb-4">Same family</Label>
                <ul className="divide-y divide-stone-200 border-y border-stone-200">
                  {edu.related.sameCategory.map(r => (
                    <li key={r.key}>
                      <Link href={`/tools/${r.key}`} className="group flex items-center justify-between py-3 text-[15px] text-stone-800 transition hover:text-emerald-800">
                        {r.name}<ArrowUpRight className="h-4 w-4 text-stone-300 transition group-hover:text-emerald-800" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label className="mb-4">Pairs well with</Label>
                <ul className="divide-y divide-stone-200 border-y border-stone-200">
                  {edu.related.complementary.map(r => (
                    <li key={r.key}>
                      <Link href={`/tools/${r.key}`} className="group block py-3.5">
                        <span className="flex items-center justify-between text-[15px] font-medium text-stone-900 transition group-hover:text-emerald-800">
                          {r.name}<ArrowUpRight className="h-4 w-4 text-stone-300 transition group-hover:text-emerald-800" />
                        </span>
                        <span className="mt-0.5 block text-[13.5px] leading-relaxed text-stone-500">{r.reason}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {edu.comparisons.length > 0 && (
              <div className="mt-14">
                <h3 className="font-serif text-[22px] text-stone-900">Side by side</h3>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-stone-300 text-[11px] uppercase tracking-[0.14em] text-stone-400">
                        <th className="py-3 pr-6 font-medium">Compared with</th><th className="py-3 pr-6 font-medium">Formula difference</th><th className="py-3 font-medium">Use-case difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {edu.comparisons.map(c => (
                        <tr key={c.otherKey} className="border-b border-stone-200 align-top">
                          <td className="py-4 pr-6"><Link href={`/tools/${c.otherKey}`} className="text-[15px] font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:text-emerald-800 hover:decoration-emerald-800">{c.otherName}</Link></td>
                          <td className="py-4 pr-6 text-[14px] leading-relaxed text-stone-600">{c.formulaDiff}</td>
                          <td className="py-4 text-[14px] leading-relaxed text-stone-600">{c.useCaseDiff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Section>

          {/* 10 CMT corner */}
          <Section id="cmt" n={10} title="CMT exam corner" lead="What gets tested, and where candidates slip.">
            <Label className="mb-3">Key formulas</Label>
            <div className="space-y-2.5">
              {edu.cmtCorner.keyFormulas.map((f, i) => <FormulaBlock key={i} size="sm">{f}</FormulaBlock>)}
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <Column title="Frequently tested concepts" rule="border-emerald-700/60"><Bullets items={edu.cmtCorner.testedConcepts} tone="emerald" /></Column>
              <div>
                <h3 className="mb-5 border-b border-rose-400/70 pb-3 text-[13px] font-semibold text-stone-900">Exam traps</h3>
                <div className="space-y-6">
                  {edu.cmtCorner.traps.map((t, i) => <Callout key={i} kind="trap">{t}</Callout>)}
                </div>
              </div>
            </div>
          </Section>

          {/* 11 Practice */}
          <Section id="practice" n={11} title="Practice" lead="Check your understanding before moving on.">
            <Quiz edu={edu} />
            {edu.practice.exercises.length > 0 && (
              <div className="mt-12">
                <h3 className="font-serif text-[22px] text-stone-900">Chart exercises</h3>
                <div className="mt-5"><Bullets items={edu.practice.exercises} /></div>
              </div>
            )}
          </Section>

          {/* 12 Tutor */}
          <Section id="tutor" n={12} title="Ask Chartix Scholar" lead="Your CMT-trained study assistant — ask anything about this indicator.">
            <Tutor edu={edu} />
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Practice quiz ──
function Quiz({ edu }: { edu: IndicatorEducation }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const total = edu.practice.quiz.length;
  const answered = Object.keys(picked).length;
  const correct = edu.practice.quiz.filter((q, i) => picked[i] === q.answer).length;
  return (
    <div>
      {answered > 0 && (
        <p className="mb-6 text-[13px] text-stone-500">
          <span className="font-medium text-stone-900">{correct} of {answered}</span> correct · {total - answered} remaining
        </p>
      )}
      <div className="space-y-6">
        {edu.practice.quiz.map((q, qi) => {
          const sel = picked[qi];
          const done = sel != null;
          return (
            <div key={qi} className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="font-mono text-[11px] text-stone-400">Question {qi + 1} of {total}</p>
              <p className="mt-2 text-[16px] font-medium leading-snug text-stone-900">{q.q}</p>
              <div className="mt-5 grid gap-2.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.answer;
                  const isSel = sel === oi;
                  let cls = 'border-stone-200 text-stone-700 hover:border-stone-400 hover:bg-stone-50';
                  let mark = 'border-stone-300 text-stone-500';
                  if (done && isCorrect) { cls = 'border-emerald-700/50 bg-emerald-50/60 text-stone-900'; mark = 'border-emerald-700 bg-emerald-700 text-white'; }
                  else if (done && isSel) { cls = 'border-rose-300 bg-rose-50/60 text-stone-900'; mark = 'border-rose-500 bg-rose-500 text-white'; }
                  else if (done) cls = 'border-stone-200 text-stone-400';
                  return (
                    <button key={oi} type="button" disabled={done} onClick={() => setPicked(p => ({ ...p, [qi]: oi }))}
                      className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 text-left text-[14.5px] transition disabled:cursor-default ${cls}`}>
                      <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-medium ${mark}`}>
                        {done && isCorrect ? <Check className="h-3.5 w-3.5" /> : done && isSel ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {done && (
                <div className="mt-5 border-l-2 border-stone-300 pl-4">
                  <p className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] ${sel === q.answer ? 'text-emerald-800' : 'text-rose-700'}`}>
                    {sel === q.answer ? 'Correct' : 'Not quite'}
                  </p>
                  <p className="mt-1 text-[14.5px] leading-[1.7] text-stone-600">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── lightweight markdown for the tutor stream (bold, code, bullet/numbered lists) ──
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-stone-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-stone-100 px-1 font-mono text-[12.5px]">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
function TutorMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  let k = 0;
  const flush = () => { if (bullets.length) { out.push(<ul key={`u${k++}`} className="my-2 space-y-1.5 pl-1">{bullets}</ul>); bullets = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const bullet = line.match(/^[-•*]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      bullets.push(<li key={`b${k++}`} className="flex items-start gap-3"><span className="mt-[10px] h-1 w-1 flex-none rounded-full bg-stone-400" /><span>{renderInline(bullet[1])}</span></li>);
    } else if (numbered) {
      bullets.push(<li key={`b${k++}`} className="flex items-start gap-2.5"><span className="flex-none font-medium text-emerald-800">{line.match(/^\d+/)![0]}.</span><span>{renderInline(numbered[1])}</span></li>);
    } else {
      flush();
      out.push(<p key={`p${k++}`} className="my-2 first:mt-0">{renderInline(line)}</p>);
    }
  }
  flush();
  return <div className="text-[14.5px] leading-[1.7] text-stone-700">{out}</div>;
}

const DAILY_FREE_LIMIT = 3;
const TUTOR_USAGE_KEY = 'chartix-lab-tutor-usage';
const TUTOR_LIMIT_MSG = `You've used your ${DAILY_FREE_LIMIT} free Chartix Scholar questions for today. Enroll for unlimited access to the full study chatbot, notes, quizzes, mock tests and analytics.`;
function readTutorUsage(): number {
  try { const raw = JSON.parse(localStorage.getItem(TUTOR_USAGE_KEY) || '{}'); return raw.date === new Date().toDateString() ? (raw.count || 0) : 0; } catch { return 0; }
}
function writeTutorUsage(count: number) {
  try { localStorage.setItem(TUTOR_USAGE_KEY, JSON.stringify({ date: new Date().toDateString(), count })); } catch { /* ignore */ }
}

function Tutor({ edu }: { edu: IndicatorEducation }) {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState('');
  const [used, setUsed] = useState(0);
  const [limited, setLimited] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore today's usage so the cap persists across refreshes (server is the real gate).
  useEffect(() => {
    const u = readTutorUsage();
    setUsed(u);
    if (u >= DAILY_FREE_LIMIT) setLimited(TUTOR_LIMIT_MSG);
  }, []);

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy || limited) return;
    setBusy(true); setAnswer(''); setAsked(q); setInput('');
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const res = await fetch('/api/public-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `About the ${edu.name} indicator: ${q}`, source: 'indicator-lab' }), signal: ctrl.signal,
      });
      if (res.status === 429) {
        const j = await res.json().catch(() => null) as { limit?: boolean; error?: { message?: string } } | null;
        writeTutorUsage(DAILY_FREE_LIMIT); // persist so a refresh stays blocked
        setLimited(j?.error?.message ?? TUTOR_LIMIT_MSG);
        setAsked(''); return;
      }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        setAnswer(j?.error?.message ?? 'The tutor is unavailable right now. Please try again.'); return;
      }
      setUsed(u => { const n = u + 1; writeTutorUsage(n); return n; });
      const reader = res.body.getReader(); const dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; setAnswer(a => a + dec.decode(value, { stream: true })); }
    } catch {
      setAnswer('Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);

  if (limited) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 text-center">
        <p className="font-serif text-[24px] text-stone-900">You’ve used your free questions for today</p>
        <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-stone-500">{limited}</p>
        <Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-900">
          Enroll for unlimited access <ArrowUpRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-xs text-stone-400">Unlimited Chartix Scholar + notes, 3,500+ MCQs, mock tests & analytics.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-[14.5px] leading-relaxed text-stone-600">{edu.aiTutor.intro}</p>
        <span className="flex-none text-xs text-stone-400">{remaining} of {DAILY_FREE_LIMIT} free questions left today</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {edu.aiTutor.suggestedQuestions.map((s, i) => (
          <button key={i} type="button" onClick={() => ask(s)} disabled={busy}
            className="rounded-full border border-stone-200 px-3.5 py-1.5 text-[13px] text-stone-600 transition hover:border-stone-400 hover:text-stone-900 disabled:opacity-50">{s}</button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); ask(input); }} className="mt-5 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask about ${edu.name}…`}
          className="min-w-0 flex-1 rounded-full border border-stone-200 bg-[#FAFAF8] px-5 py-3 text-[14.5px] text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Ask"
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-emerald-800 text-white transition hover:bg-emerald-900 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {(asked || answer) && (
        <div className="mt-6 border-t border-stone-200 pt-6">
          {asked && <p className="text-[15px] font-medium text-stone-900">{asked}</p>}
          <div className="mt-3">
            {answer ? <TutorMarkdown content={answer} /> : (busy ? <span className="inline-flex items-center gap-2 text-sm text-stone-400"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span> : null)}
          </div>
          <p className="mt-5 text-xs text-stone-400">The Chartix Scholar answers from the CMT curriculum. <Link href="/sign-up" className="text-emerald-800 underline underline-offset-2">Enroll</Link> for unlimited questions + the full study platform.</p>
        </div>
      )}
    </div>
  );
}
