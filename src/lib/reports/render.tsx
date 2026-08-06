import { readFile } from 'fs/promises';
import path from 'path';
import { ImageResponse } from 'next/og';
import type { CumulativeFlow, SectorSnapshot } from './fii-dii-data';

// satori (which ImageResponse uses) does not fall back to system fonts - it
// only draws glyphs from fonts explicitly handed to it, and only understands
// TTF/OTF (the woff2 Social Studio uses in-browser fails to parse here with
// "Unsupported OpenType signature wOF2"). These are static-weight TTF
// instances of the same Manrope family, generated once via fonttools from
// public/fonts/studio/Manrope-Variable.woff2, specifically for this
// server-side renderer. Both ₹ (U+20B9) and − (U+2212) are present.
type Weight = 400 | 700 | 800;
const FONT_FILES: Record<Weight, string> = {
  400: 'manrope-regular.ttf',
  700: 'manrope-semibold.ttf',
  800: 'manrope-bold.ttf',
};
const fontCache = new Map<Weight, ArrayBuffer>();

async function loadFont(weight: Weight): Promise<ArrayBuffer> {
  const cached = fontCache.get(weight);
  if (cached) return cached;
  const p = path.join(process.cwd(), 'public', 'fonts', 'reports', FONT_FILES[weight]);
  const buf = await readFile(p);
  const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  fontCache.set(weight, data);
  return data;
}

export const REPORT_W = 1080;
export const REPORT_H = 1350;

const GREEN = '#0F5C35';
const RED = '#B3242B';
const INK = '#0B1220';
const MUTED = '#64748B';
const LINE = '#E2E8F0';

function cr(v: number): string {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(2).replace(/\.00$/, '')}k` : a.toFixed(0);
  return `${v < 0 ? '−' : '+'}₹${s} Cr`;
}

function BigNumber({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
        {label}
      </div>
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, color: value >= 0 ? GREEN : RED, marginTop: 4 }}>
        {cr(value)}
      </div>
    </div>
  );
}

/** One sector row: name on the left, two value+bar columns (fortnight, 1-year). */
function SectorRow({ row, maxFortnight, maxYear }: {
  row: SectorSnapshot['rows'][number]; maxFortnight: number; maxYear: number;
}) {
  const fPct = Math.min(100, (Math.abs(row.fortnightCr) / maxFortnight) * 100);
  const yPct = Math.min(100, (Math.abs(row.oneYearCr) / maxYear) * 100);
  const fColor = row.fortnightCr >= 0 ? GREEN : RED;
  const yColor = row.oneYearCr >= 0 ? GREEN : RED;

  return (
    <div style={{
      display: 'flex', width: '100%', alignItems: 'center',
      padding: '14px 0', borderBottom: `1px solid ${LINE}`,
    }}>
      <div style={{ display: 'flex', width: 268, fontSize: 21, fontWeight: 700, color: INK, paddingRight: 12 }}>
        {row.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', width: 340, gap: 4 }}>
        <div style={{ display: 'flex', width: '100%', height: 14, background: '#F1F5F9', borderRadius: 4 }}>
          <div style={{ display: 'flex', width: `${fPct}%`, height: 14, background: fColor, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: fColor }}>{cr(row.fortnightCr)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', width: 340, gap: 4, marginLeft: 24 }}>
        <div style={{ display: 'flex', width: '100%', height: 14, background: '#F1F5F9', borderRadius: 4 }}>
          <div style={{ display: 'flex', width: `${yPct}%`, height: 14, background: yColor, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: yColor }}>{cr(row.oneYearCr)}</div>
      </div>
    </div>
  );
}

export function buildReportElement(opts: {
  kind: 'weekly' | 'monthly';
  cumulative: CumulativeFlow;
  sector: SectorSnapshot | null;
  logoDataUrl: string;
}) {
  const { kind, cumulative, sector } = opts;
  const title = kind === 'weekly' ? 'Weekly FII & DII Report' : 'Monthly FII & DII Report';
  const maxFortnight = sector ? Math.max(...sector.rows.map((r) => Math.abs(r.fortnightCr)), 1) : 1;
  const maxYear = sector ? Math.max(...sector.rows.map((r) => Math.abs(r.oneYearCr)), 1) : 1;

  return (
    <div style={{
      width: REPORT_W, height: REPORT_H, display: 'flex', flexDirection: 'column',
      background: '#FBFCFB', padding: '64px 64px 48px', fontFamily: 'Manrope, Arial, sans-serif',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={opts.logoDataUrl} width={40} height={40} alt="" style={{ borderRadius: 8 }} />
        <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: INK }}>Chartix</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>
        <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: INK, lineHeight: 1.08 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED, marginTop: 8 }}>
          {cumulative.periodLabel} · {cumulative.sessionCount} sessions
        </div>
      </div>

      {/* cumulative flow */}
      <div style={{
        display: 'flex', marginTop: 34, padding: '28px 32px', background: '#fff',
        border: `1px solid ${LINE}`, borderRadius: 20, gap: 48,
      }}>
        <BigNumber label="FII Net" value={cumulative.fiiNetCr} />
        <BigNumber label="DII Net" value={cumulative.diiNetCr} />
        <BigNumber label="Combined" value={cumulative.combinedCr} />
      </div>

      {/* sector table */}
      {sector && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, color: INK }}>Sector-Wise FPI Flow</div>
            <div style={{ display: 'flex', fontSize: 16, color: MUTED }}>
              NSDL data as of {sector.asOf ?? 'last fortnight'}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 18, paddingBottom: 8, borderBottom: `2px solid ${INK}` }}>
            <div style={{ display: 'flex', width: 268, fontSize: 14, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>Sector</div>
            <div style={{ display: 'flex', width: 340, fontSize: 14, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' }}>Fortnight</div>
            <div style={{ display: 'flex', width: 340, fontSize: 14, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginLeft: 24 }}>1-Year</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sector.rows.map((r) => (
              <SectorRow key={r.name} row={r} maxFortnight={maxFortnight} maxYear={maxYear} />
            ))}
          </div>
        </div>
      )}

      {/* footer */}
      <div style={{
        display: 'flex', flexDirection: 'column', marginTop: 'auto', paddingTop: 20,
        borderTop: `1px solid ${LINE}`, gap: 4,
      }}>
        <div style={{ display: 'flex', fontSize: 15, color: MUTED }}>
          Cash flow: NSE (live) · Sector allocation: NSDL fortnightly FPI report
        </div>
        <div style={{ display: 'flex', fontSize: 15, color: MUTED }}>
          Educational content, not investment advice · chartix.in
        </div>
      </div>
    </div>
  );
}

export async function renderReportPng(opts: {
  kind: 'weekly' | 'monthly';
  cumulative: CumulativeFlow;
  sector: SectorSnapshot | null;
}): Promise<ArrayBuffer> {
  const buf = await fetch('https://chartix.in/chartix-icon.png').then((r) => r.arrayBuffer());
  const logoDataUrl = `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  const [regular, semibold, bold] = await Promise.all([
    loadFont(400), loadFont(700), loadFont(800),
  ]);

  const img = new ImageResponse(
    buildReportElement({ ...opts, logoDataUrl }),
    {
      width: REPORT_W, height: REPORT_H,
      fonts: [
        { name: 'Manrope', data: regular, weight: 400, style: 'normal' },
        { name: 'Manrope', data: semibold, weight: 700, style: 'normal' },
        { name: 'Manrope', data: bold, weight: 800, style: 'normal' },
      ],
    },
  );
  return img.arrayBuffer();
}
