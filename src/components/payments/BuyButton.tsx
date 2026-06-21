'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Tag, X, CheckCircle, Loader2, AlertCircle, ShieldCheck, Clock } from 'lucide-react';

type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
};
declare global {
  interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void }; }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_ENABLED = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '').startsWith('rzp_');
const BASE_PRICE = 699900;

function fmt(paise: number) {
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type AppliedCoupon = { code: string; discountPaise: number; finalPaise: number; label: string };

export function BuyButton({ userName = '' }: { userName?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadCheckout().catch(() => {});
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const applyCode = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/payments/coupon-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponError(data?.error?.message ?? 'Invalid coupon code.');
      } else {
        setApplied(data.data);
        setCouponError('');
      }
    } catch {
      setCouponError('Could not validate. Try again.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput]);

  const removeCoupon = () => { setApplied(null); setCouponInput(''); setCouponError(''); };

  const startPayment = useCallback(async () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    setPayError('');
    setPaying(true);
    try {
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) throw new Error('Could not load payment window. Check your connection.');

      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applied ? { couponCode: applied.code } : {}),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error?.message ?? 'Could not start payment.');

      const { orderId, amount, currency, keyId, prefill } = payload.data;
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Chartix',
        description: 'CMT Level 1 — 6 months access',
        prefill: { ...prefill, name: name.trim(), contact: phone.trim() || prefill?.contact },
        theme: { color: '#047857' },
        handler: async (resp) => {
          try {
            const v = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const vp = await v.json();
            if (!v.ok || !vp.success) throw new Error(vp.error?.message ?? 'Verification failed.');
            window.location.href = '/user';
          } catch (e) {
            setPayError(e instanceof Error ? e.message : 'Verification failed. Contact support if charged.');
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setPaying(false);
    }
  }, [name, phone, applied]);

  if (!RAZORPAY_ENABLED) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
        Online payments are launching soon. Access is by invite coupon only for now.
      </div>
    );
  }

  const finalAmount = applied ? applied.finalPaise : BASE_PRICE;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
      >
        Get instant access — {fmt(BASE_PRICE)}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            {/* Close */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">CMT Level 1</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-900">Complete your purchase</h2>

            <div className="mt-5 space-y-4">
              {/* Name */}
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Your name</span>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              {/* Phone */}
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Phone number <span className="text-zinc-400">(optional)</span></span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>

              {/* Coupon */}
              <div className="text-sm">
                <span className="font-medium text-zinc-700">Promo code <span className="text-zinc-400">(optional)</span></span>
                {applied ? (
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-800">{applied.code}</span>
                      <span className="text-xs text-emerald-700">{applied.label}</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-emerald-500 hover:text-emerald-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                          placeholder="PROMO CODE"
                          className="w-full rounded-xl border border-zinc-300 py-2.5 pl-9 pr-3 font-mono text-sm tracking-wide focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyCode}
                        disabled={!couponInput.trim() || couponLoading}
                        className="shrink-0 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="flex items-center gap-1.5 text-xs text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />{couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Price summary */}
            <div className="mt-5 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">CMT Level 1 · 6 months</span>
                {applied ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 line-through">{fmt(BASE_PRICE)}</span>
                    <span className="font-bold text-emerald-700">{fmt(finalAmount)}</span>
                  </span>
                ) : (
                  <span className="font-bold text-zinc-900">{fmt(BASE_PRICE)}</span>
                )}
              </div>
              {applied && (
                <p className="mt-1 text-xs text-emerald-600">You save {fmt(applied.discountPaise)}</p>
              )}
            </div>

            {payError && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{payError}
              </p>
            )}

            {/* Pay button */}
            <button
              type="button"
              onClick={startPayment}
              disabled={paying || !name.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {paying
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Opening payment…</>
                : `Pay ${fmt(finalAmount)} securely`}
            </button>

            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Razorpay secured</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> UPI · Cards · Net banking</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
