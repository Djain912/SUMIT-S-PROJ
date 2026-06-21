'use client';

import { useMemo, useState } from 'react';
import { Ticket, Copy, Check, Trash2, Infinity as InfinityIcon, Loader2, Percent, IndianRupee } from 'lucide-react';

type Chapter = { id: string; level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'; title: string; isPublished: boolean };
type Coupon = {
  id: string; code: string; days: number | null; allChapters: boolean; chapterIds: string[];
  isActive: boolean; maxRedemptions: number | null; redeemedCount: number; note: string | null; createdAt: string;
  discountType: 'PERCENT' | 'FIXED' | null; discountValue: number | null; minOrderPaise: number | null;
};

const LEVEL_LABEL: Record<string, string> = { LEVEL_1: 'CMT Level I', LEVEL_2: 'CMT Level II', LEVEL_3: 'CMT Level III' };

export function CouponsManager({ chapters, initialCoupons }: { chapters: Chapter[]; initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [code, setCode] = useState('');
  const [days, setDays] = useState(30);
  const [maxRedemptions, setMaxRedemptions] = useState<string>('');
  const [note, setNote] = useState('');
  const [couponPurpose, setCouponPurpose] = useState<'access' | 'discount'>('access');
  const [accessType, setAccessType] = useState<'full' | 'chapters'>('chapters');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [minOrder, setMinOrder] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const chaptersByLevel = useMemo(() => {
    const map: Record<string, Chapter[]> = {};
    for (const c of chapters) (map[c.level] ??= []).push(c);
    return map;
  }, [chapters]);
  const chapterTitle = useMemo(() => Object.fromEntries(chapters.map((c) => [c.id, c.title])), [chapters]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleLevel(level: string) {
    const ids = (chaptersByLevel[level] ?? []).map((c) => c.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function createCoupon() {
    setError('');
    if (!code.trim()) { setError('Enter a coupon code.'); return; }
    if (couponPurpose === 'access' && accessType === 'chapters' && selected.size === 0) {
      setError('Pick at least one chapter, or choose Full Access.'); return;
    }
    if (couponPurpose === 'discount' && (!discountValue || Number(discountValue) < 1)) {
      setError('Enter a valid discount value.'); return;
    }
    setBusy(true);
    try {
      const body = couponPurpose === 'discount'
        ? {
            code: code.trim(),
            discountType,
            discountValue: Number(discountValue),
            minOrderPaise: minOrder ? Number(minOrder) * 100 : null,
            note: note.trim() || null,
            maxRedemptions: maxRedemptions === '' ? null : Number(maxRedemptions),
          }
        : {
            code: code.trim(),
            days,
            allChapters: accessType === 'full',
            chapterIds: accessType === 'full' ? [] : [...selected],
            note: note.trim() || null,
            maxRedemptions: maxRedemptions === '' ? null : Number(maxRedemptions),
          };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json?.error?.message ?? 'Could not create coupon.'); return; }
      setCoupons((prev) => [json.data, ...prev]);
      setCode(''); setNote(''); setMaxRedemptions(''); setSelected(new Set());
      setDays(30); setAccessType('chapters'); setDiscountValue(''); setMinOrder('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Coupon) {
    const res = await fetch('/api/admin/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
    const json = await res.json();
    if (res.ok && json.success) setCoupons((prev) => prev.map((x) => (x.id === c.id ? json.data : x)));
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"? Users who already redeemed it keep their access; the code just stops working for new redemptions.`)) return;
    const res = await fetch(`/api/admin/coupons?id=${c.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (res.ok && json.success) setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="space-y-6">
      {/* ── Create coupon ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-zinc-900">Create a new coupon</h2>
        </div>

        {/* Coupon purpose toggle */}
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-700">Coupon type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCouponPurpose('access')}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${couponPurpose === 'access' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
              Free access (gives content days)
            </button>
            <button type="button" onClick={() => setCouponPurpose('discount')}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${couponPurpose === 'discount' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
              Price discount (reduces checkout price)
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="font-medium text-zinc-700">Coupon code</span>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SAVE20"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono uppercase tracking-wide focus:border-emerald-500 focus:outline-none" />
          </label>

          {couponPurpose === 'access' ? (
            <label className="text-sm">
              <span className="font-medium text-zinc-700">Days of access</span>
              <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
            </label>
          ) : (
            <>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Discount type</span>
                <div className="mt-1 flex gap-1.5">
                  <button type="button" onClick={() => setDiscountType('PERCENT')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold transition ${discountType === 'PERCENT' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-600'}`}>
                    <Percent className="h-3.5 w-3.5" /> %
                  </button>
                  <button type="button" onClick={() => setDiscountType('FIXED')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold transition ${discountType === 'FIXED' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-600'}`}>
                    <IndianRupee className="h-3.5 w-3.5" /> ₹
                  </button>
                </div>
              </label>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">{discountType === 'PERCENT' ? 'Percentage off (1–90)' : 'Amount off (₹)'}</span>
                <input type="number" min={1} max={discountType === 'PERCENT' ? 90 : undefined} value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'PERCENT' ? '20' : '1000'}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-zinc-700">Min order ₹ <span className="text-zinc-400">(optional)</span></span>
                <input type="number" min={1} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="e.g. 5000"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" />
              </label>
            </>
          )}

          <label className="text-sm">
            <span className="font-medium text-zinc-700">Max uses <span className="text-zinc-400">(optional)</span></span>
            <input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
          </label>
          <label className="text-sm">
            <span className="font-medium text-zinc-700">Label <span className="text-zinc-400">(optional)</span></span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. WhatsApp promo"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
          </label>
        </div>

        {/* Access type (free-access coupons only) */}
        {couponPurpose === 'access' && (
        <div className="mt-5">
          <p className="text-sm font-medium text-zinc-700">What does this coupon unlock?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAccessType('chapters')}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${accessType === 'chapters' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
              Specific chapters
            </button>
            <button type="button" onClick={() => setAccessType('full')}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${accessType === 'full' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
              Full access (everything)
            </button>
          </div>
        </div>
        )}

        {/* Chapter picker */}
        {couponPurpose === 'access' && accessType === 'chapters' && (
          <div className="mt-4 space-y-4">
            {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((level) => {
              const list = chaptersByLevel[level] ?? [];
              if (list.length === 0) return null;
              const allOn = list.every((c) => selected.has(c.id));
              return (
                <div key={level} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{LEVEL_LABEL[level]}</p>
                    <button type="button" onClick={() => toggleLevel(level)}
                      className="text-xs font-semibold text-emerald-700 hover:underline">
                      {allOn ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {list.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-white">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-emerald-600" />
                        <span className={c.isPublished ? '' : 'text-zinc-400'}>{c.title}{!c.isPublished && ' (draft)'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-zinc-500">{selected.size} chapter{selected.size === 1 ? '' : 's'} selected.</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <button type="button" onClick={createCoupon} disabled={busy}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />} Create coupon
        </button>
      </div>

      {/* ── Existing coupons ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <p className="border-b border-zinc-100 px-5 py-3 text-sm font-bold text-zinc-900">Existing coupons ({coupons.length})</p>
        {coupons.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">No coupons yet. Create one above.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {coupons.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wide text-zinc-900">{c.code}</span>
                    <button type="button" onClick={() => copy(c.code)} title="Copy code"
                      className="text-zinc-400 hover:text-emerald-600">
                      {copied === c.code ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                      {c.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.discountType ? (
                      <>
                        <span className="font-semibold text-violet-600">
                          {c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₹${((c.discountValue ?? 0) / 100).toLocaleString('en-IN')} off`}
                        </span>
                        {c.minOrderPaise ? ` · min order ₹${Math.round(c.minOrderPaise / 100).toLocaleString('en-IN')}` : ''}
                        {' · '}Price discount at checkout
                      </>
                    ) : (
                      <>
                        {c.allChapters ? 'Full access (all chapters)' : `${c.chapterIds.length} chapter${c.chapterIds.length === 1 ? '' : 's'}`}
                        {' · '}{c.days} days
                      </>
                    )}
                    {' · '}{c.redeemedCount} used{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                    {c.maxRedemptions == null && <InfinityIcon className="ml-0.5 inline h-3 w-3 align-text-bottom" />}
                    {c.note ? ` · ${c.note}` : ''}
                  </p>
                  {!c.allChapters && c.chapterIds.length > 0 && (
                    <p className="mt-1 truncate text-[11px] text-zinc-400" title={c.chapterIds.map((id) => chapterTitle[id] ?? id).join(', ')}>
                      {c.chapterIds.map((id) => chapterTitle[id] ?? '—').filter(Boolean).slice(0, 4).join(', ')}
                      {c.chapterIds.length > 4 ? ` +${c.chapterIds.length - 4} more` : ''}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => toggleActive(c)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-300">
                    {c.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button type="button" onClick={() => remove(c)} title="Delete"
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
