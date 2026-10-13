'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { cr, fmtDate, fmtMonth, monthKey, type CashDay } from '@/lib/fii-dii/format';

const PAGE = 25;

function toCsv(rows: CashDay[]) {
  const head = 'Date,FII Buy (Cr),FII Sell (Cr),FII Net (Cr),DII Buy (Cr),DII Sell (Cr),DII Net (Cr),Combined Net (Cr)';
  const body = rows.map((r) => [r.date, r.fiiBuy, r.fiiSell, r.fiiNet, r.diiBuy, r.diiSell, r.diiNet, +(r.fiiNet + r.diiNet).toFixed(2)].join(','));
  return [head, ...body].join('\n');
}

export function DailyTable({ rows }: { rows: CashDay[] }) {
  const months = useMemo(() => [...new Set(rows.map((r) => monthKey(r.date)))].sort().reverse(), [rows]);
  const [month, setMonth] = useState('all');
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const list = month === 'all' ? rows : rows.filter((r) => monthKey(r.date) === month);
    return [...list].reverse();
  }, [rows, month]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const download = () => {
    const blob = new Blob([toCsv([...filtered].reverse())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chartix-fii-dii-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cell = 'whitespace-nowrap px-4 py-3 text-right font-mono text-[13px] tabular-nums';
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <label className="flex items-center gap-3 text-[13px] text-stone-500">
          Month
          <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(0); }}
            className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-900 focus:border-stone-400 focus:outline-none">
            <option value="all">All sessions</option>
            {months.map((m) => <option key={m} value={m}>{fmtMonth(m, true)}</option>)}
          </select>
        </label>
        <button type="button" onClick={download}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3.5 py-1.5 text-[13px] text-stone-700 transition hover:border-stone-400 hover:text-stone-900">
          <Download className="h-3.5 w-3.5" /> Download CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.1em] text-stone-400">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">FII bought</th>
              <th className="px-4 py-3 text-right font-medium">FII sold</th>
              <th className="px-4 py-3 text-right font-medium text-stone-600">FII net</th>
              <th className="px-4 py-3 text-right font-medium">DII bought</th>
              <th className="px-4 py-3 text-right font-medium">DII sold</th>
              <th className="px-4 py-3 text-right font-medium text-stone-600">DII net</th>
              <th className="px-4 py-3 text-right font-medium text-stone-600">Combined</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">
                <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-stone-700">{fmtDate(r.date)}</td>
                <td className={`${cell} text-stone-500`}>{cr(r.fiiBuy, { sign: false, compact: false })}</td>
                <td className={`${cell} text-stone-500`}>{cr(r.fiiSell, { sign: false, compact: false })}</td>
                <td className={`${cell} font-medium text-stone-900`}>{cr(r.fiiNet, { compact: false })}</td>
                <td className={`${cell} text-stone-500`}>{cr(r.diiBuy, { sign: false, compact: false })}</td>
                <td className={`${cell} text-stone-500`}>{cr(r.diiSell, { sign: false, compact: false })}</td>
                <td className={`${cell} font-medium text-stone-900`}>{cr(r.diiNet, { compact: false })}</td>
                <td className={`${cell} text-stone-700`}>{cr(r.fiiNet + r.diiNet, { compact: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-stone-200 px-5 py-3 text-[13px] text-stone-500">
        <span>{filtered.length} sessions</span>
        {pages > 1 && (
          <div className="flex items-center gap-3">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-md px-2 py-1 transition hover:text-stone-900 disabled:opacity-30">← Newer</button>
            <span className="tabular-nums">{page + 1} / {pages}</span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-md px-2 py-1 transition hover:text-stone-900 disabled:opacity-30">Older →</button>
          </div>
        )}
      </div>
    </div>
  );
}
