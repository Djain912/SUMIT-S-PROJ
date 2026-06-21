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

type Billing = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst: string;
};

type FieldErrors = Partial<Record<keyof Billing, string>>;

export function BuyButton({ userName = '', userEmail = '' }: { userName?: string; userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [billing, setBilling] = useState<Billing>({
    name: userName,
    phone: '',
    email: userEmail,
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBilling(b => ({ ...b, name: userName || b.name, email: userEmail || b.email }));
      loadCheckout().catch(() => {});
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open, userName, userEmail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const set = (field: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBilling(b => ({ ...b, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!billing.name.trim())    errs.name    = 'Full name is required';
    if (!billing.phone.trim())   errs.phone   = 'Phone number is required';
    if (!billing.address.trim()) errs.address = 'Address is required';
    if (!billing.city.trim())    errs.city    = 'City is required';
    if (!billing.pincode.trim()) errs.pincode = 'Postal / PIN code is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
    if (!validate()) return;
    setPayError('');
    setPaying(true);
    try {
      const ok = await loadCheckout();
      if (!ok || !window.Razorpay) throw new Error('Could not load payment window. Check your connection.');

      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: applied?.code ?? null,
          billingName: billing.name.trim(),
          billingPhone: billing.phone.trim(),
          billingEmail: billing.email.trim() || null,
          billingAddress: billing.address.trim(),
          billingCity: billing.city.trim(),
          billingState: billing.state,
          billingPincode: billing.pincode.trim(),
          billingGst: billing.gst.trim() || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error?.message ?? 'Could not start payment.');

      const { orderId, amount, currency, keyId } = payload.data;
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Chartix',
        description: 'CMT Level 1 — 6 months access',
        prefill: {
          name: billing.name.trim(),
          email: billing.email.trim() || undefined,
          contact: billing.phone.trim(),
        },
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing, applied]);

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
          <div className="relative w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-zinc-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">CMT Level 1</p>
              <h2 className="mt-1 text-lg font-bold text-zinc-900">Complete your purchase</h2>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Contact Details ── */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Contact Details</p>
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Full name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      value={billing.name}
                      onChange={set('name')}
                      placeholder="As on ID / for invoice"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.name ? 'border-rose-400 focus:border-rose-400' : 'border-zinc-300 focus:border-emerald-500'}`}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Mobile number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={billing.phone}
                      onChange={set('phone')}
                      placeholder="+91 98765 43210"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.phone ? 'border-rose-400 focus:border-rose-400' : 'border-zinc-300 focus:border-emerald-500'}`}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Email for invoice <span className="text-zinc-400 text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={billing.email}
                      onChange={set('email')}
                      placeholder="invoice@example.com"
                      className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ── Billing Address ── */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Billing Address</p>
                <div className="space-y-3">
                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      Street / flat / building <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={billing.address}
                      onChange={set('address')}
                      placeholder="House no., street, area"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.address ? 'border-rose-400 focus:border-rose-400' : 'border-zinc-300 focus:border-emerald-500'}`}
                    />
                    {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
                  </div>

                  {/* City + PIN */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                        City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billing.city}
                        onChange={set('city')}
                        placeholder="Mumbai"
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.city ? 'border-rose-400 focus:border-rose-400' : 'border-zinc-300 focus:border-emerald-500'}`}
                      />
                      {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                        Postal / PIN code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={billing.pincode}
                        onChange={set('pincode')}
                        placeholder="400001"
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${errors.pincode ? 'border-rose-400 focus:border-rose-400' : 'border-zinc-300 focus:border-emerald-500'}`}
                      />
                      {errors.pincode && <p className="mt-1 text-xs text-rose-600">{errors.pincode}</p>}
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      State / Province <span className="text-zinc-400 text-xs font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={billing.state}
                      onChange={set('state')}
                      placeholder="e.g. Maharashtra, California, Ontario"
                      className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                      GSTIN <span className="text-zinc-400 text-xs font-normal">(optional — for business invoices)</span>
                    </label>
                    <input
                      type="text"
                      value={billing.gst}
                      onChange={set('gst')}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 font-mono text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ── Promo Code ── */}
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Promo Code</p>
                {applied ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
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

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-zinc-100 px-6 py-4 bg-white rounded-b-2xl">
              {/* Price summary */}
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 mb-3">
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
                <p className="mb-3 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{payError}
                </p>
              )}

              <button
                type="button"
                onClick={startPayment}
                disabled={paying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {paying
                  ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Opening payment…</>
                  : `Pay ${fmt(finalAmount)} securely`}
              </button>

              <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Razorpay secured</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> UPI · Cards · Net banking</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
