import { COLORS, cr, num, longShare, stance, type LongShort, type Sector } from '@/lib/fii-dii/format';

/** Horizontal bar measuring a signed value against a shared max, centred on zero. */
export function SignedBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(50, (Math.abs(value) / max) * 50);
  return (
    <div className="relative h-2 w-full rounded-full bg-stone-100" title={cr(value)}>
      <span className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
      <span className="absolute inset-y-0 rounded-full" style={{
        backgroundColor: color,
        width: `${pct}%`,
        ...(value >= 0 ? { left: '50%' } : { right: '50%' }),
      }} />
    </div>
  );
}

/** Long vs short split with plain labels — positions, not good/bad, so neutral inks. */
export function PositionSplit({ title, note, p }: { title: string; note: string; p: LongShort }) {
  const lp = longShare(p);
  return (
    <div className="py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-[16px] font-semibold text-stone-900">{title}</h3>
        <p className="text-[13.5px] text-stone-500">
          <span className="font-medium text-stone-900">{stance(lp)}</span> · net {num(p.long - p.short, true)} contracts
        </p>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`${lp.toFixed(0)}% long, ${(100 - lp).toFixed(0)}% short`}>
        <span className="h-full rounded-l-full bg-stone-800" style={{ width: `${lp}%` }} />
        <span className="h-full w-[2px] flex-none bg-white" />
        <span className="h-full flex-1 rounded-r-full bg-stone-300" />
      </div>
      <div className="mt-2.5 flex justify-between text-[13px]">
        <span className="text-stone-700"><span className="font-medium text-stone-900">{lp.toFixed(0)}% long</span> · {num(p.long)}</span>
        <span className="text-stone-500">{num(p.short)} · <span className="font-medium text-stone-700">{(100 - lp).toFixed(0)}% short</span></span>
      </div>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-stone-500">{note}</p>
    </div>
  );
}

/** Share-of-holdings bars (one hue, magnitude only). */
export function HoldingsBars({ sectors }: { sectors: Sector[] }) {
  const max = Math.max(...sectors.map((s) => s.aumPct));
  return (
    <ul className="space-y-3.5">
      {sectors.map((s) => (
        <li key={s.name} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_52px] items-center gap-4 sm:grid-cols-[220px_minmax(0,1fr)_56px]">
          <span className="truncate text-[14px] text-stone-700" title={s.name}>{s.name}</span>
          <span className="h-2.5 rounded-r-[4px]" style={{ width: `${(s.aumPct / max) * 100}%`, backgroundColor: COLORS.fii, minWidth: 2 }} />
          <span className="text-right font-mono text-[13px] tabular-nums text-stone-900">{s.aumPct.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}

/** Diverging inflow/outflow bars. Zero sits where the data needs it; values in their own column. */
export function FlowBars({ sectors, field }: { sectors: Sector[]; field: 'fortnightCr' | 'oneYearCr' }) {
  const maxPos = Math.max(0, ...sectors.map((s) => s[field]));
  const maxNeg = Math.max(0, ...sectors.map((s) => -s[field]));
  const span = Math.max(1, maxPos + maxNeg);
  const zero = (maxNeg / span) * 100;
  return (
    <ul className="space-y-2.5">
      {sectors.map((s) => {
        const v = s[field];
        const w = (Math.abs(v) / span) * 100;
        return (
          <li key={s.name} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_92px] items-center gap-4 sm:grid-cols-[220px_minmax(0,1fr)_110px]">
            <span className="truncate text-[14px] text-stone-700" title={s.name}>{s.name}</span>
            <div className="relative h-5">
              <span className="absolute inset-y-0 w-px bg-stone-300" style={{ left: `${zero}%` }} />
              {v !== 0 && (
                <span className={`absolute top-1/2 h-2.5 -translate-y-1/2 ${v > 0 ? 'rounded-r-[4px]' : 'rounded-l-[4px]'}`}
                  style={{ width: `max(2px, ${w}%)`, backgroundColor: v > 0 ? COLORS.buy : COLORS.sell, ...(v > 0 ? { left: `${zero}%` } : { right: `${100 - zero}%` }) }} />
              )}
            </div>
            <span className="text-right font-mono text-[12.5px] tabular-nums text-stone-800">{cr(v)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Tiny fortnightly history: one bar per report, above/below a zero line. */
export function Spark({ values }: { values: number[] }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values.map(Math.abs));
  const w = 4, gap = 2, h = 24;
  return (
    <svg width={values.length * (w + gap)} height={h} aria-hidden className="inline-block">
      <line x1={0} x2={values.length * (w + gap)} y1={h / 2} y2={h / 2} stroke="#E7E5E0" />
      {values.map((v, i) => {
        const bh = Math.max(1, (Math.abs(v) / max) * (h / 2 - 1));
        return <rect key={i} x={i * (w + gap)} y={v >= 0 ? h / 2 - bh : h / 2} width={w} height={bh} rx={1} fill={v >= 0 ? COLORS.buy : COLORS.sell} opacity={i === values.length - 1 ? 1 : 0.55} />;
      })}
    </svg>
  );
}
