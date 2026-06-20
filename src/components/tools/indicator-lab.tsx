'use client';

import { useMemo, useState, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Info, HelpCircle, Calculator, Brain, CloudSun, Gauge, Radio, Network,
  GitCompare, AlertTriangle, GraduationCap, Dumbbell, Sparkles, ChevronDown,
  ChevronRight, CheckCircle2, XCircle, Send, Loader2, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import { computeRsi } from '@/lib/tools/indicators';
import { IndicatorTool, type IndicatorKey } from '@/components/tools/indicator-tool';
import { getEducation, type IndicatorEducation, type Tone, type SignalType } from '@/lib/tools/indicator-education';

// ── small UI helpers ──
const toneStyles: Record<Tone, string> = {
  bull: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  bear: 'border-rose-200 bg-rose-50 text-rose-800',
  neutral: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  caution: 'border-amber-200 bg-amber-50 text-amber-800',
};
const toneIcon: Record<Tone, ReactNode> = {
  bull: <TrendingUp className="h-4 w-4" />,
  bear: <TrendingDown className="h-4 w-4" />,
  neutral: <Minus className="h-4 w-4" />,
  caution: <AlertTriangle className="h-4 w-4" />,
};

function Module({ id, icon, n, title, subtitle, children, defaultOpen = true }: {
  id: string; icon: ReactNode; n: number; title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition hover:bg-zinc-50">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500">Module {n}</span>
          <span className="block font-heading text-[17px] font-bold leading-tight tracking-tight text-zinc-900">{title}</span>
          {subtitle && <span className="block truncate text-xs text-zinc-500">{subtitle}</span>}
        </span>
        <span className="flex-none text-zinc-400">{open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</span>
      </button>
      {open && <div className="border-t border-zinc-100 px-5 py-5">{children}</div>}
    </section>
  );
}

function Bullets({ items, tone = 'zinc' }: { items: string[]; tone?: 'emerald' | 'rose' | 'amber' | 'zinc' }) {
  const dot = { emerald: 'text-emerald-500', rose: 'text-rose-500', amber: 'text-amber-500', zinc: 'text-zinc-400' }[tone];
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-zinc-700">
          <span className={`mt-1 flex-none text-base font-bold ${dot}`}>▸</span><span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Prominent formula display — dark slate card, mono font, emerald accent.
function FormulaBlock({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border-l-4 border-emerald-400 bg-zinc-900 px-4 ${size === 'md' ? 'py-3.5' : 'py-2.5'} shadow-sm`}>
      <code className={`font-mono font-semibold tracking-tight text-emerald-50 ${size === 'md' ? 'text-[15px]' : 'text-[13px]'} whitespace-nowrap`}>{children}</code>
    </div>
  );
}

// Emphasis callouts. Each variant teaches a specific kind of insight.
type CalloutKind = 'why' | 'pro' | 'trap' | 'exam';
const calloutCfg: Record<CalloutKind, { ring: string; chip: string; label: string; icon: ReactNode }> = {
  why: { ring: 'border-emerald-200 bg-emerald-50/70', chip: 'bg-emerald-600', label: 'Why this matters', icon: <Info className="h-3 w-3" /> },
  pro: { ring: 'border-indigo-200 bg-indigo-50/70', chip: 'bg-indigo-600', label: 'Professional insight', icon: <Brain className="h-3 w-3" /> },
  trap: { ring: 'border-rose-200 bg-rose-50/70', chip: 'bg-rose-500', label: 'Common trap', icon: <AlertTriangle className="h-3 w-3" /> },
  exam: { ring: 'border-amber-200 bg-amber-50/70', chip: 'bg-amber-500', label: 'Exam focus', icon: <GraduationCap className="h-3 w-3" /> },
};
function Callout({ kind, title, children }: { kind: CalloutKind; title?: string; children: ReactNode }) {
  const c = calloutCfg[kind];
  return (
    <div className={`rounded-xl border ${c.ring} px-4 py-3`}>
      <span className={`inline-flex items-center gap-1 rounded-full ${c.chip} px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white`}>{c.icon} {c.label}</span>
      {title && <p className="mt-2 text-[13.5px] font-bold text-zinc-900">{title}</p>}
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-700">{children}</p>
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

export function IndicatorLab({ indicator }: { indicator: IndicatorKey }) {
  const edu = getEducation(indicator);

  // Indicators without published education content fall back to the classic tool.
  if (!edu) return <IndicatorTool indicator={indicator} />;
  return <Lab edu={edu} indicator={indicator} />;
}

function Lab({ edu, indicator }: { edu: IndicatorEducation; indicator: IndicatorKey }) {
  const [period, setPeriod] = useState(14);

  const { line, latest, latestDate } = useMemo(() => {
    const { rows, line } = computeRsi(AAPL_SAMPLE, period);
    let li = line.length - 1; while (li >= 0 && line[li] == null) li--;
    return { line, latest: li >= 0 ? (line[li] as number) : null, latestDate: li >= 0 ? rows[li].date : '' };
  }, [period]);

  // 6 — interpretation band for the live value
  const band = useMemo(() => {
    if (latest == null) return null;
    return edu.interpretation.bands.find(b =>
      (b.min == null || latest >= b.min) && (b.max == null || latest <= b.max)) ?? null;
  }, [latest, edu]);

  // 7 — run detectors referenced by the data
  const detections = useMemo(() => {
    const closes = AAPL_SAMPLE.map(b => b.close);
    const out: Record<SignalType, Detected> = {} as Record<SignalType, Detected>;
    const at = (i: number): Detected => i < 0 ? { present: false } : { present: true, date: AAPL_SAMPLE[i].date, value: line[i] as number };
    out.overbought = at(lastWhere(line, v => v >= 70));
    out.oversold = at(lastWhere(line, v => v <= 30));
    out.centerline_up = at(lastCross(line, 50, true));
    out.centerline_down = at(lastCross(line, 50, false));

    // divergence: compare the last two qualifying swing points within the recent window
    const win = 60, start = Math.max(0, line.length - win);
    const idxs = Array.from({ length: line.length - start }, (_, k) => k + start).filter(i => line[i] != null);
    const priceHi = swings(closes, 3, true).filter(i => i >= start);
    const priceLo = swings(closes, 3, false).filter(i => i >= start);
    const bear = (() => {
      if (priceHi.length < 2) return { present: false };
      const [a, b] = [priceHi[priceHi.length - 2], priceHi[priceHi.length - 1]];
      if (line[a] == null || line[b] == null) return { present: false };
      return closes[b] > closes[a] && (line[b] as number) < (line[a] as number) ? { present: true, date: AAPL_SAMPLE[b].date, value: line[b] as number } : { present: false };
    })();
    const bull = (() => {
      if (priceLo.length < 2) return { present: false };
      const [a, b] = [priceLo[priceLo.length - 2], priceLo[priceLo.length - 1]];
      if (line[a] == null || line[b] == null) return { present: false };
      return closes[b] < closes[a] && (line[b] as number) > (line[a] as number) ? { present: true, date: AAPL_SAMPLE[b].date, value: line[b] as number } : { present: false };
    })();
    void idxs;
    out.bearish_divergence = bear as Detected;
    out.bullish_divergence = bull as Detected;
    return out;
  }, [line]);

  const toc = [
    ['snapshot', 'Snapshot'], ['why', 'Why It Exists'], ['calc', 'Calculation'], ['thinks', 'How It Thinks'],
    ['env', 'Market Environment'], ['interp', 'Live Interpretation'], ['signals', 'Signals'], ['related', 'Related'],
    ['compare', 'Compare'], ['mistakes', 'Mistakes'], ['cmt', 'CMT Corner'], ['practice', 'Practice'], ['tutor', 'AI Tutor'],
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">Indicator Lab</span>
          <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">{edu.snapshot.difficulty}</span>
        </div>
        <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-emerald-950 sm:text-4xl">{edu.name}</h1>
        <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-zinc-600">{edu.tagline}</p>
      </div>

      {/* Sticky module nav */}
      <nav className="sticky top-16 z-30 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-zinc-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur [scrollbar-width:none]">
        {toc.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="flex-none rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 transition hover:bg-emerald-50 hover:text-emerald-700">{label}</a>
        ))}
      </nav>

      {/* 1 — Snapshot */}
      <Module id="snapshot" n={1} icon={<Info className="h-4 w-4" />} title="Indicator Snapshot" subtitle="The essentials at a glance">
        <dl className="grid gap-3 sm:grid-cols-2">
          {([
            ['Category', edu.snapshot.category], ['Creator', edu.snapshot.creator],
            ['Difficulty', edu.snapshot.difficulty], ['Market type', edu.snapshot.marketType],
            ['Primary purpose', edu.snapshot.primaryPurpose],
          ] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{k}</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-800">{v}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Formula</dt>
            <dd><FormulaBlock>{edu.snapshot.formula}</FormulaBlock></dd>
          </div>
        </dl>
      </Module>

      {/* 2 — Why it exists */}
      <Module id="why" n={2} icon={<HelpCircle className="h-4 w-4" />} title="Why This Indicator Exists" subtitle="The problem it solves">
        <div className="space-y-4">
          {([['The problem it solves', edu.whyExists.problem], ['Historical context', edu.whyExists.history], ['Practical use case', edu.whyExists.useCase]] as const).map(([h, b]) => (
            <div key={h}>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{h}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-700">{b}</p>
            </div>
          ))}
        </div>
      </Module>

      {/* 3 — Interactive calculation (narrative + live tool) */}
      <Module id="calc" n={3} icon={<Calculator className="h-4 w-4" />} title="Interactive Calculation Breakdown" subtitle="Every step, on real price data">
        <ol className="mb-5 space-y-3">
          {edu.calcSteps.map((s, i) => (
            <li key={i} className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[15px] font-bold text-zinc-900">{s.title}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-600">{s.detail}</p>
                  {s.formula && <div className="mt-2.5"><FormulaBlock size="sm">{s.formula}</FormulaBlock></div>}
                  {s.whyMatters && <div className="mt-2.5"><Callout kind="why">{s.whyMatters}</Callout></div>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-zinc-200 bg-white p-1">
          <IndicatorTool indicator={indicator} />
        </div>
      </Module>

      {/* 4 — How it thinks */}
      <Module id="thinks" n={4} icon={<Brain className="h-4 w-4" />} title="How This Indicator Thinks" subtitle="What it sees — and what it can't">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">✓ What it measures</p>
            <Bullets items={edu.howItThinks.measures} tone="emerald" />
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-500">✕ What it ignores</p>
            <Bullets items={edu.howItThinks.ignores} tone="rose" />
          </div>
        </div>
        {edu.proInsights.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">How professionals actually use it</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {edu.proInsights.map((p, i) => <Callout key={i} kind="pro" title={p.title}>{p.body}</Callout>)}
            </div>
          </div>
        )}
      </Module>

      {/* 5 — Market environment */}
      <Module id="env" n={5} icon={<CloudSun className="h-4 w-4" />} title="Market Environment Analysis" subtitle="Where it shines and where it breaks">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Best conditions</p>
            <Bullets items={edu.marketEnvironment.best} tone="emerald" />
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-600">Worst conditions</p>
            <Bullets items={edu.marketEnvironment.worst} tone="amber" />
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-500">Common failures</p>
            <Bullets items={edu.marketEnvironment.failures} tone="rose" />
          </div>
        </div>
      </Module>

      {/* 6 — Dynamic interpretation engine */}
      <Module id="interp" n={6} icon={<Gauge className="h-4 w-4" />} title="Dynamic Interpretation Engine" subtitle="Plain-English read of the live value">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-zinc-500">Lookback period</label>
          <input type="range" min={7} max={21} value={period} onChange={e => setPeriod(parseInt(e.target.value, 10))} className="h-1.5 w-44 accent-emerald-600" />
          <span className="rounded-lg bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">{period}</span>
          {latest != null && (
            <span className="ml-auto font-mono text-sm">
              <span className="text-zinc-400">RSI({period}) =</span> <span className="font-bold text-zinc-900">{latest.toFixed(1)}</span>
              <span className="ml-2 text-xs text-zinc-400">as of {latestDate}</span>
            </span>
          )}
        </div>
        {band && (
          <div className={`rounded-xl border px-4 py-4 ${toneStyles[band.tone]}`}>
            <p className="flex items-center gap-2 text-sm font-bold">{toneIcon[band.tone]} {band.label}</p>
            <p className="mt-1.5 text-sm leading-relaxed">{band.message}</p>
          </div>
        )}
        <div className="mt-4"><Callout kind="pro">{edu.interpretation.note}</Callout></div>
      </Module>

      {/* 7 — Signal explanation layer */}
      <Module id="signals" n={7} icon={<Radio className="h-4 w-4" />} title="Signal Explanation Layer" subtitle="What fired, why, and how much to trust it">
        <div className="space-y-3">
          {edu.signals.map(sig => {
            const d = detections[sig.type];
            return (
              <div key={sig.type} className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-zinc-800">{sig.name}</p>
                  {d?.present
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Detected{d.date ? ` · ${d.date}` : ''}</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500"><Minus className="h-3 w-3" /> Not present</span>}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-700"><span className="font-semibold text-zinc-600">Why:</span> {sig.why}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700"><span className="font-semibold">Reliability:</span> {sig.reliability}</p>
              </div>
            );
          })}
        </div>
      </Module>

      {/* 8 — Related framework */}
      <Module id="related" n={8} icon={<Network className="h-4 w-4" />} title="Related Indicator Framework" subtitle="Siblings and partners">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Same category</p>
            <div className="flex flex-wrap gap-2">
              {edu.related.sameCategory.map(r => (
                <Link key={r.key} href={`/tools/${r.key}`} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700">{r.name}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Complementary (different angle)</p>
            <div className="space-y-2">
              {edu.related.complementary.map(r => (
                <Link key={r.key} href={`/tools/${r.key}`} className="block rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50/40">
                  <span className="text-sm font-semibold text-emerald-700">{r.name}</span>
                  <span className="block text-xs text-zinc-500">{r.reason}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Module>

      {/* 9 — Compare */}
      <Module id="compare" n={9} icon={<GitCompare className="h-4 w-4" />} title="Compare Indicators" subtitle="Side-by-side with close cousins" defaultOpen={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <th className="px-3 py-2">Vs</th><th className="px-3 py-2">Formula difference</th><th className="px-3 py-2">Use-case difference</th>
              </tr>
            </thead>
            <tbody>
              {edu.comparisons.map(c => (
                <tr key={c.otherKey} className="border-b border-zinc-100 align-top">
                  <td className="px-3 py-3"><Link href={`/tools/${c.otherKey}`} className="font-semibold text-emerald-700 hover:underline">{c.otherName}</Link></td>
                  <td className="px-3 py-3 text-zinc-600">{c.formulaDiff}</td>
                  <td className="px-3 py-3 text-zinc-600">{c.useCaseDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Module>

      {/* 10 — Common mistakes */}
      <Module id="mistakes" n={10} icon={<AlertTriangle className="h-4 w-4" />} title="Common Mistakes" subtitle="Beginner traps vs pro interpretation">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-rose-500">Beginner mistakes</p>
            <Bullets items={edu.mistakes.beginner} tone="rose" />
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">How professionals read it</p>
            <Bullets items={edu.mistakes.professional} tone="emerald" />
          </div>
        </div>
      </Module>

      {/* 11 — CMT corner */}
      <Module id="cmt" n={11} icon={<GraduationCap className="h-4 w-4" />} title="CMT Exam Corner" subtitle="What gets tested">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Key formulas</p>
            <div className="space-y-2">
              {edu.cmtCorner.keyFormulas.map((f, i) => <FormulaBlock key={i} size="sm">{f}</FormulaBlock>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Frequently tested concepts</p>
            <Bullets items={edu.cmtCorner.testedConcepts} tone="emerald" />
          </div>
          <div>
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-rose-500">Exam traps</p>
            <div className="space-y-2.5">
              {edu.cmtCorner.traps.map((t, i) => <Callout key={i} kind="trap">{t}</Callout>)}
            </div>
          </div>
        </div>
      </Module>

      {/* 12 — Practice */}
      <Module id="practice" n={12} icon={<Dumbbell className="h-4 w-4" />} title="Interactive Practice Mode" subtitle="Test yourself">
        <Quiz edu={edu} />
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Chart exercises</p>
          <Bullets items={edu.practice.exercises} tone="zinc" />
        </div>
      </Module>

      {/* 13 — AI tutor */}
      <Module id="tutor" n={13} icon={<Sparkles className="h-4 w-4" />} title="AI Tutor — Chartix Scholar" subtitle="Ask anything about this indicator">
        <Tutor edu={edu} />
      </Module>
    </div>
  );
}

// ── Module 12 quiz ──
function Quiz({ edu }: { edu: IndicatorEducation }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <div className="space-y-4">
      {edu.practice.quiz.map((q, qi) => {
        const sel = picked[qi];
        const answered = sel != null;
        return (
          <div key={qi} className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-800">{qi + 1}. {q.q}</p>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.answer;
                const isSel = sel === oi;
                let cls = 'border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300';
                if (answered && isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                else if (answered && isSel) cls = 'border-rose-300 bg-rose-50 text-rose-800';
                return (
                  <button key={oi} type="button" disabled={answered} onClick={() => setPicked(p => ({ ...p, [qi]: oi }))}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${cls}`}>
                    {answered && isCorrect && <CheckCircle2 className="h-4 w-4 flex-none text-emerald-600" />}
                    {answered && isSel && !isCorrect && <XCircle className="h-4 w-4 flex-none text-rose-500" />}
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {answered && <p className="mt-2.5 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600"><span className="font-semibold text-zinc-700">Explanation:</span> {q.explanation}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Module 13 streaming AI tutor (reuses /api/public-chat) ──
// ── lightweight markdown for the tutor stream (bold, code, bullet/numbered lists) ──
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-zinc-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-zinc-200 px-1 font-mono text-[12px]">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
function TutorMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];
  let k = 0;
  const flush = () => { if (bullets.length) { out.push(<ul key={`u${k++}`} className="my-1.5 space-y-1 pl-1">{bullets}</ul>); bullets = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const bullet = line.match(/^[-•*]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      bullets.push(<li key={`b${k++}`} className="flex items-start gap-2"><span className="mt-1.5 flex-none text-emerald-500">▸</span><span>{renderInline(bullet[1])}</span></li>);
    } else if (numbered) {
      bullets.push(<li key={`b${k++}`} className="flex items-start gap-2"><span className="flex-none font-semibold text-emerald-600">{line.match(/^\d+/)![0]}.</span><span>{renderInline(numbered[1])}</span></li>);
    } else {
      flush();
      out.push(<p key={`p${k++}`} className="my-1.5 first:mt-0">{renderInline(line)}</p>);
    }
  }
  flush();
  return <div className="text-[13.5px] leading-relaxed text-zinc-700">{out}</div>;
}

const DAILY_FREE_LIMIT = 3;

function Tutor({ edu }: { edu: IndicatorEducation }) {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState('');
  const [used, setUsed] = useState(0);
  const [limited, setLimited] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        setLimited(j?.error?.message ?? 'You’ve reached today’s free question limit.');
        setAsked(''); return;
      }
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        setAnswer(j?.error?.message ?? 'The tutor is unavailable right now. Please try again.'); return;
      }
      setUsed(u => u + 1);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; setAnswer(a => a + dec.decode(value, { stream: true })); }
    } catch {
      setAnswer('Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);

  // Hard upsell once the daily cap is hit
  if (limited) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-7 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-emerald-600" />
        <p className="mt-3 text-base font-bold text-emerald-900">You&apos;ve used your free questions for today</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{limited}</p>
        <Link href="/sign-up" className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
          Enroll for unlimited access <Send className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-[11px] text-zinc-400">Unlimited Chartix Scholar + notes, 3,500+ MCQs, mock tests & analytics.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-zinc-600">{edu.aiTutor.intro}</p>
        <span className="flex-none rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{remaining}/{DAILY_FREE_LIMIT} free today</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {edu.aiTutor.suggestedQuestions.map((s, i) => (
          <button key={i} type="button" onClick={() => ask(s)} disabled={busy}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">{s}</button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); ask(input); }} className="mt-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask about ${edu.name}…`}
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <button type="submit" disabled={busy || !input.trim()} className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
      {(asked || answer) && (
        <div className="mt-4 space-y-3">
          {asked && <p className="text-sm font-semibold text-zinc-800">{asked}</p>}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
            {answer ? <TutorMarkdown content={answer} /> : (busy ? <span className="inline-flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span> : null)}
          </div>
          <p className="text-[11px] text-zinc-400">The Chartix Scholar answers from the CMT curriculum. <Link href="/sign-up" className="font-semibold text-emerald-600 hover:underline">Enroll</Link> for unlimited questions + the full study platform.</p>
        </div>
      )}
    </div>
  );
}
