import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET — per-saved-index daily performance for the "My Indices" dashboard:
// latest-session % change, ~30-session % change, and a sparkline of levels.
// Levels are recomputed from stock_eod using the index's own weighting, so
// they match what a fresh Build would show (equal: mean of normalized closes;
// market-cap: customWeights as share counts).
export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const rows = await prisma.index.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, weightingType: true, constituents: true, customWeights: true },
    });
    if (!rows.length) return NextResponse.json({ success: true, data: [] });

    // Collect every symbol across the user's indices (sanitized — these are
    // user-supplied strings at save time, and we inline them into SQL).
    const symSet = new Set<string>();
    for (const ix of rows) {
      const cons = Array.isArray(ix.constituents) ? (ix.constituents as unknown[]) : [];
      for (const c of cons) {
        const sym = String(c ?? '').toUpperCase().replace(/\.(NS|BO)$/, '').trim();
        if (/^[A-Z0-9&.\- ]{1,25}$/.test(sym)) symSet.add(sym);
      }
    }
    if (!symSet.size) return NextResponse.json({ success: true, data: [] });

    const inList = [...symSet].map((s) => `'${s}'`).join(',');
    const eod = await prisma.$queryRawUnsafe<Array<{ symbol: string; d: string; c: number | null }>>(
      `SELECT symbol, d::text AS d, c FROM stock_eod
       WHERE symbol IN (${inList})
         AND d >= (SELECT MAX(d) FROM stock_eod) - INTERVAL '60 days'
       ORDER BY d`,
    );

    // symbol -> { date -> close }
    const px = new Map<string, Map<string, number>>();
    const dateSet = new Set<string>();
    for (const r of eod) {
      if (!(r.c && r.c > 0)) continue;
      if (!px.has(r.symbol)) px.set(r.symbol, new Map());
      px.get(r.symbol)!.set(r.d, r.c);
      dateSet.add(r.d);
    }
    const allDates = [...dateSet].sort();
    // last ~31 sessions is plenty for spark + 30d change
    const dates = allDates.slice(-31);

    const data = rows.map((ix) => {
      const cons = (Array.isArray(ix.constituents) ? (ix.constituents as unknown[]) : [])
        .map((c) => String(c ?? '').toUpperCase().replace(/\.(NS|BO)$/, '').trim())
        .filter((s) => s.length > 0);
      const weights = (ix.customWeights ?? {}) as Record<string, number>;
      const covered = cons.filter((s) => px.has(s));

      const levels: number[] = [];
      if (covered.length >= 1 && dates.length >= 2) {
        // forward-fill closes per covered symbol over the window
        const filled = new Map<string, number[]>();
        for (const s of covered) {
          const m = px.get(s)!;
          let last = NaN;
          const arr = dates.map((d) => { const v = m.get(d); if (v && v > 0) last = v; return last; });
          filled.set(s, arr);
        }
        // start at the first date where every covered symbol has a price
        let si = -1;
        for (let i = 0; i < dates.length; i++) {
          if (covered.every((s) => !isNaN(filled.get(s)![i]))) { si = i; break; }
        }
        if (si >= 0) {
          const equal = ix.weightingType === 'EQUAL';
          for (let i = si; i < dates.length; i++) {
            let lvl = 0;
            if (equal) {
              let sum = 0;
              for (const s of covered) sum += filled.get(s)![i] / filled.get(s)![si];
              lvl = (sum / covered.length) * 100;
            } else {
              for (const s of covered) {
                const w = typeof weights[s] === 'number' && weights[s] > 0 ? weights[s] : 1;
                lvl += filled.get(s)![i] * w;
              }
            }
            levels.push(lvl);
          }
        }
      }

      const n = levels.length;
      const changePct = n >= 2 ? ((levels[n - 1] / levels[n - 2]) - 1) * 100 : null;
      const change30Pct = n >= 2 ? ((levels[n - 1] / levels[0]) - 1) * 100 : null;
      // normalize spark to 0..1 for tiny SVG rendering
      let spark: number[] = [];
      if (n >= 2) {
        const mn = Math.min(...levels), mx = Math.max(...levels);
        spark = levels.map((v) => (mx > mn ? (v - mn) / (mx - mn) : 0.5));
      }
      return {
        id: ix.id,
        changePct: changePct === null ? null : Math.round(changePct * 100) / 100,
        change30Pct: change30Pct === null ? null : Math.round(change30Pct * 100) / 100,
        spark: spark.map((v) => Math.round(v * 100) / 100),
        covered: covered.length,
        total: cons.length,
        lastDate: dates.length ? dates[dates.length - 1] : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to view your indices' } }, { status: 401 });
    }
    console.error('[index-builder/indices/summary GET] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Could not load summary' } }, { status: 500 });
  }
}
