import { readFile } from 'fs/promises';
import path from 'path';
import type { ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { loadFont } from '@/lib/reports/render';
import {
  COLORS, cr, fmtDate, longShare, num, sessionSummary, stance, sum,
  type CashDay, type FnoDay, type LongShort, type Sector,
} from './format';

// Server-rendered share cards (1080×1350) for the end-of-day Telegram post.
// Same palette and tone as the /tools/fii-dii pages.
const W = 1080;
const H = 1350;
const PAPER = '#FAFAF8';
const INK = '#1C1917';
const BODY = '#57534E';
const MUTED = '#A8A29E';
const LINE = '#E7E5E0';
const GREEN = '#065F46';

let logoCache: string | null = null;
async function logo() {
  if (!logoCache) {
    const buf = await readFile(path.join(process.cwd(), 'public', 'chartix-wordmark.png'));
    logoCache = `data:image/png;base64,${buf.toString('base64')}`;
  }
  return logoCache;
}

async function render(node: ReactNode): Promise<ArrayBuffer> {
  const [regular, semibold, bold] = await Promise.all([loadFont(400), loadFont(700), loadFont(800)]);
  const img = new ImageResponse(node as React.ReactElement, {
    width: W, height: H,
    fonts: [
      { name: 'Manrope', data: regular, weight: 400, style: 'normal' },
      { name: 'Manrope', data: semibold, weight: 700, style: 'normal' },
      { name: 'Manrope', data: bold, weight: 800, style: 'normal' },
    ],
  });
  return img.arrayBuffer();
}

function Frame({ logoSrc, eyebrow, title, subtitle, children }: { logoSrc: string; eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: PAPER, padding: '64px 72px', fontFamily: 'Manrope', color: INK }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={186} height={48} alt="" />
        <div style={{ display: 'flex', fontSize: 20, color: MUTED }}>chartix.in</div>
      </div>
      <div style={{ display: 'flex', marginTop: 56, fontSize: 19, fontWeight: 700, letterSpacing: 3, color: GREEN }}>{eyebrow}</div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>{title}</div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 24, color: BODY }}>{subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 40 }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${LINE}`, paddingTop: 24, fontSize: 20, color: BODY }}>
        <div style={{ display: 'flex', fontWeight: 700, color: INK }}>Free daily FII &amp; DII data → chartix.in/tools/fii-dii</div>
        <div style={{ display: 'flex', color: MUTED }}>Not investment advice</div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, note }: { label: string; value: string; color?: string; note: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 24, padding: '24px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 17, fontWeight: 700, letterSpacing: 2, color: MUTED }}>
        {color && <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 4, background: color, marginRight: 10 }} />}
        {label}
      </div>
      <div style={{ display: 'flex', marginTop: 14, fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{value}</div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 18, color: BODY }}>{note}</div>
    </div>
  );
}

/** Paired FII/DII bars for recent sessions, drawn with flex boxes (satori has no SVG text layout). */
function MiniBars({ rows }: { rows: CashDay[] }) {
  const h = 190;
  const max = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.fiiNet), Math.abs(r.diiNet)]));
  const half = h / 2;
  const bar = (v: number, color: string) => {
    const len = Math.max(2, (Math.abs(v) / max) * (half - 6));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: 13, height: h }}>
        <div style={{ display: 'flex', height: half, alignItems: 'flex-end' }}>
          {v >= 0 && <div style={{ display: 'flex', width: 13, height: len, background: color, borderRadius: '4px 4px 0 0' }} />}
        </div>
        <div style={{ display: 'flex', height: half, alignItems: 'flex-start' }}>
          {v < 0 && <div style={{ display: 'flex', width: 13, height: len, background: color, borderRadius: '0 0 4px 4px' }} />}
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 24, padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: BODY }}>
        <div style={{ display: 'flex', fontWeight: 700, color: INK }}>Last {rows.length} sessions · daily net</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 3, background: COLORS.fii, marginRight: 8 }} />FII
          <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 3, background: COLORS.dii, margin: '0 8px 0 22px' }} />DII
        </div>
      </div>
      <div style={{ display: 'flex', position: 'relative', marginTop: 18, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: half, height: 1, background: '#D6D3CD' }} />
        {rows.map((r) => (
          <div key={r.date} style={{ display: 'flex', gap: 2 }}>
            {bar(r.fiiNet, COLORS.fii)}
            {bar(r.diiNet, COLORS.dii)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 16, color: MUTED }}>
        <div style={{ display: 'flex' }}>{fmtDate(rows[0].date, 'day')}</div>
        <div style={{ display: 'flex' }}>{fmtDate(rows[rows.length - 1].date, 'day')}</div>
      </div>
    </div>
  );
}

export async function renderDailyCard(rows: CashDay[]): Promise<ArrayBuffer> {
  const d = rows[rows.length - 1];
  const summary = sessionSummary(rows);
  const last5 = rows.slice(-5);
  const last22 = rows.slice(-22);
  const src = await logo();
  return render(
    <Frame logoSrc={src} eyebrow="FII & DII DATA · NSE CASH MARKET" title="Institutional money flows" subtitle={fmtDate(d.date, 'long')}>
      <div style={{ display: 'flex', gap: 16 }}>
        <Stat label="FII / FPI NET" color={COLORS.fii} value={cr(d.fiiNet, { compact: false })} note={`Sold ${cr(d.fiiSell, { sign: false })}`} />
        <Stat label="DII NET" color={COLORS.dii} value={cr(d.diiNet, { compact: false })} note={`Bought ${cr(d.diiBuy, { sign: false })}`} />
        <Stat label="COMBINED" value={cr(d.fiiNet + d.diiNet, { compact: false })} note={d.fiiNet + d.diiNet >= 0 ? 'Net money in' : 'Net money out'} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, fontSize: 25, lineHeight: 1.45, color: INK }}>
        {summary.map((s) => <div key={s} style={{ display: 'flex', marginBottom: 8 }}>{s}</div>)}
      </div>
      <div style={{ display: 'flex', marginTop: 4, fontSize: 20, color: BODY }}>
        {`Last 5 sessions: FII ${cr(sum(last5, 'fiiNet'))} · DII ${cr(sum(last5, 'diiNet'))}`}
      </div>
      <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 32, flexDirection: 'column' }}>
        <MiniBars rows={last22} />
      </div>
    </Frame>,
  );
}

function Split({ title, p }: { title: string; p: LongShort }) {
  const lp = longShare(p);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: `1px solid ${LINE}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 20, color: BODY }}>{`${stance(lp)} · net ${num(p.long - p.short, true)}`}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 14, height: 18, borderRadius: 9, background: '#E7E5E0' }}>
        <div style={{ display: 'flex', width: `${lp}%`, height: 18, borderRadius: 9, background: '#292524' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 19, color: BODY }}>
        <div style={{ display: 'flex' }}>{`${lp.toFixed(0)}% long · ${num(p.long)}`}</div>
        <div style={{ display: 'flex' }}>{`${num(p.short)} · ${(100 - lp).toFixed(0)}% short`}</div>
      </div>
    </div>
  );
}

export async function renderFnoCard(days: FnoDay[]): Promise<ArrayBuffer> {
  const d = days[days.length - 1];
  const prev = days[days.length - 2];
  const idx = longShare(d.fii.idxFut);
  const change = prev ? (d.fii.idxFut.long - d.fii.idxFut.short) - (prev.fii.idxFut.long - prev.fii.idxFut.short) : 0;
  const src = await logo();
  return render(
    <Frame logoSrc={src} eyebrow="FII & DII DATA · DERIVATIVES" title="F&O positions" subtitle={`${fmtDate(d.date, 'long')} · contracts, not rupees`}>
      <div style={{ display: 'flex', fontSize: 27, lineHeight: 1.45 }}>
        {`FIIs held ${idx.toFixed(0)}% of index-futures contracts long — ${stance(idx)}.${change ? ` Net position ${change > 0 ? 'rose' : 'fell'} by ${num(Math.abs(change))} contracts.` : ''}`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
        <Split title="FII index futures" p={d.fii.idxFut} />
        <Split title="FII index calls" p={d.fii.idxCall} />
        <Split title="FII index puts" p={d.fii.idxPut} />
        <Split title="FII stock futures" p={d.fii.stkFut} />
        <Split title="DII index futures" p={d.dii.idxFut} />
      </div>
    </Frame>,
  );
}

export async function renderSectorCard(sectors: Sector[], asOf: string): Promise<ArrayBuffer> {
  const byShare = [...sectors].sort((a, b) => b.aumPct - a.aumPct).slice(0, 6);
  const flows = [...sectors].filter((s) => s.fortnightCr !== 0).sort((a, b) => b.fortnightCr - a.fortnightCr);
  const movers = [...flows.slice(0, 3).filter((s) => s.fortnightCr > 0), ...flows.slice(-4).reverse()];
  const maxShare = Math.max(...byShare.map((s) => s.aumPct));
  const maxFlow = Math.max(1, ...movers.map((s) => Math.abs(s.fortnightCr)));
  const src = await logo();
  const row = (name: string, pct: number, color: string, value: string) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '11px 0' }}>
      <div style={{ display: 'flex', width: 360, fontSize: 21 }}>{name}</div>
      <div style={{ display: 'flex', flex: 1, height: 16 }}>
        <div style={{ display: 'flex', width: `${Math.max(1, pct)}%`, height: 16, borderRadius: 5, background: color }} />
      </div>
      <div style={{ display: 'flex', width: 170, justifyContent: 'flex-end', fontSize: 21, fontWeight: 700 }}>{value}</div>
    </div>
  );
  return render(
    <Frame logoSrc={src} eyebrow="FII & DII DATA · SECTORS" title="Where foreign money sits" subtitle={`NSDL fortnightly report · period ending ${fmtDate(asOf, 'long')}`}>
      <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 2, color: MUTED }}>SHARE OF FPI HOLDINGS</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {byShare.map((s) => row(s.name, (s.aumPct / maxShare) * 100, COLORS.fii, `${s.aumPct.toFixed(1)}%`))}
      </div>
      <div style={{ display: 'flex', marginTop: 34, fontSize: 20, fontWeight: 700, letterSpacing: 2, color: MUTED }}>BIGGEST FORTNIGHT MOVES</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {movers.map((s) => row(s.name, (Math.abs(s.fortnightCr) / maxFlow) * 100, s.fortnightCr >= 0 ? COLORS.buy : COLORS.sell, cr(s.fortnightCr)))}
      </div>
    </Frame>,
  );
}
