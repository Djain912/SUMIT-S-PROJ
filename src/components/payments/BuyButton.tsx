'use client';

import { useState, useCallback } from 'react';

// Razorpay's checkout.js attaches a global. Minimal typing — we only use what we call.
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
// Only enable the live button when a real Razorpay key is present.
const RAZORPAY_ENABLED = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '').startsWith('rzp_');

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

export function BuyButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPayment = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) throw new Error('Could not load the payment window. Check your connection and try again.');

      const res = await fetch('/api/payments/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
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
            // Access granted — reload into the dashboard.
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
  }, []);

  if (!RAZORPAY_ENABLED) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
        Online payments are launching soon. For now, access is by invite coupon only.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={startPayment}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {loading
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Opening payment…</>
          : 'Get instant access — ₹6,999'}
      </button>
      {error && <p className="mt-2 text-center text-xs text-rose-600">{error}</p>}
      <p className="mt-2 text-center text-[11px] text-zinc-400">Secure payment via Razorpay · UPI, cards, net banking</p>
    </div>
  );
}
