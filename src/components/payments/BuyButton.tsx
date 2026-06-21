'use client';

import { useState, useCallback } from 'react';
import { Tag, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
};
declare global {
  interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void }; }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_ENABLED = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '').startsWith('rzp_');
const BASE_PRICE = 699900; // paise

function paise2rupees(p: number) {
  return '₹' + Math.round(p / 100).toLocaleString('en-IN');
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

export function BuyButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

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
        return;
      }
      setApplied(data.data);
      setCouponError('');
    } catch {
      setCouponError('Could not validate coupon. Try again.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput]);

  const removeCoupon = () => {
    setApplied(null);
    setCouponInput('');
    setCouponError('');
  };

  const startPayment = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) throw new Error('Could not load the payment window. Check your connection and try again.');

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
        prefill,
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
            setError(e instanceof Error ? e.message : 'Verification failed. If you were charged, contact support.');
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [applied]);

  if (!RAZORPAY_ENABLED) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
        Online payments are launching soon. For now, access is by invite coupon only.
      </div>
    );
  }

  const finalAmount = applied ? applied.finalPaise : BASE_PRICE;

  return (
    <div className="mt-6 space-y-3">
      {/* Applied coupon chip */}
      {applied ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <span className="text-sm font-bold text-emerald-800">{applied.code}</span>
              <span className="ml-2 text-sm text-emerald-700">{applied.label}</span>
            </div>
          </div>
          <button type="button" onClick={removeCoupon} className="ml-2 shrink-0 text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : showCoupon ? (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                placeholder="PROMO CODE"
                className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 font-mono text-sm tracking-wide focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              type="button"
              onClick={applyCode}
              disabled={!couponInput.trim() || couponLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </button>
            <button type="button" onClick={() => { setShowCoupon(false); setCouponError(''); setCouponInput(''); }} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          {couponError && (
            <p className="flex items-center gap-1.5 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {couponError}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCoupon(true)}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-emerald-700 transition"
        >
          <Tag className="h-3.5 w-3.5" /> Have a promo code?
        </button>
      )}

      {/* Pay button */}
      <button
        type="button"
        onClick={startPayment}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {loading ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Opening payment…</>
        ) : applied ? (
          <>
            <span className="line-through opacity-60 text-xs">{paise2rupees(BASE_PRICE)}</span>
            Get instant access — {paise2rupees(finalAmount)}
          </>
        ) : (
          `Get instant access — ${paise2rupees(BASE_PRICE)}`
        )}
      </button>

      {error && <p className="text-center text-xs text-rose-600">{error}</p>}
      <p className="text-center text-[11px] text-zinc-400">Secure payment via Razorpay · UPI, cards, net banking</p>
    </div>
  );
}
