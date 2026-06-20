'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle, TrendingUp, Clock, AlertCircle, Lock } from 'lucide-react';

const plans = [
  {
    level: 'CMT Level 1',
    badge: 'L1',
    comingSoon: false,
    priceINR: '₹6,999',
    priceUSD: '$89',
    period: 'per level',
    description: 'Foundational Principles of Technical Analysis. Ideal for first-time CMT candidates.',
    features: [
      'All Level 1 study notes (chapter-wise)',
      '3,500+ practice MCQs at exam difficulty',
      'Unlimited mock tests',
      'Customised MCQ tests by topic & difficulty',
      'Chapter-wise & full-test quiz modes',
      'Performance analytics dashboard',
      'Chartix Scholar (CMT-trained chatbot)',
      'Progress tracking & streaks',
      '6 months access from date of purchase',
    ],
  },
  {
    level: 'CMT Level 2',
    badge: 'L2',
    comingSoon: true,
    priceINR: '₹6,999',
    priceUSD: '$89',
    period: 'per level',
    description: 'Application of Technical Analysis Methods. For candidates advancing to Level 2.',
    features: [
      'All Level 2 study notes (chapter-wise)',
      '3,500+ practice MCQs at exam difficulty',
      'Unlimited mock tests',
      'Customised MCQ tests by topic & difficulty',
      'Chapter-wise & full-test quiz modes',
      'Performance analytics dashboard',
      'Chartix Scholar (CMT-trained chatbot)',
      'Progress tracking & streaks',
      'Weak-area identification reports',
      '6 months access from date of purchase',
    ],
  },
  {
    level: 'CMT Level 3',
    badge: 'L3',
    comingSoon: true,
    priceINR: '₹6,999',
    priceUSD: '$89',
    period: 'per level',
    description: 'The Work of a Technical Analyst. For advanced candidates completing the CMT charter.',
    features: [
      'All Level 3 study notes (chapter-wise)',
      '3,500+ practice MCQs at exam difficulty',
      'Unlimited mock tests',
      'Customised MCQ tests by topic & difficulty',
      'Essay question guidance & frameworks',
      'Chapter-wise & full-test quiz modes',
      'Performance analytics dashboard',
      'Chartix Scholar (CMT-trained chatbot)',
      'Weak-area identification reports',
      '6 months access from date of purchase',
      'Priority support',
    ],
  },
];

const faqs = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — you can access a limited set of notes and questions for free after signing up. No credit card required.',
  },
  {
    q: 'Can I access all three levels with one payment?',
    a: 'Each level is priced and sold separately. You purchase access to the specific CMT level you are currently preparing for. There is no bundled plan.',
  },
  {
    q: 'If I buy Level 1, can I access Level 2 content?',
    a: "No. Each purchase gives access only to that level's content. To access Level 2, you would need to purchase the Level 2 plan separately.",
  },
  {
    q: 'How long is the access valid?',
    a: 'Access is valid for 6 months from the date of purchase. This gives you ample time to prepare for any CMT exam window.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept UPI, credit/debit cards, net banking, and wallets via Razorpay. International cards are accepted — Razorpay handles currency conversion automatically.',
  },
  {
    q: 'What is the refund policy?',
    a: 'There is NO refund once enrollment is confirmed. Please review the free trial content before purchasing. Exceptions are made only for verified duplicate charges or platform-wide technical failures. See our full Refund Policy for details.',
  },
  {
    q: 'Is Chartix affiliated with the CMT Association?',
    a: 'No. Chartix is an independent preparation platform and is not affiliated with or endorsed by the CMT Association.',
  },
];

export default function PricingPage() {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  return (
    <div className="min-h-screen bg-[#f0f7f4]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-emerald-900">Chartix</span>
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
            Get started free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 sm:py-20 text-center px-4 bg-white">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          Simple pricing
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-emerald-900 sm:text-5xl">
          Pay only for your level
        </h1>
        <p className="mt-4 mx-auto max-w-xl text-base leading-7 text-zinc-500">
          No bundles, no confusion. Choose the CMT level you&apos;re preparing for and get full access to everything you need to pass.
        </p>

        {/* Important notice */}
        <div className="mt-6 inline-flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-left max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Each plan gives access to that level only.</strong> Buying Level 1 does not include Level 2 or 3 content. Access is valid for 6 months.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Currency toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setCurrency('INR')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                currency === 'INR'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-emerald-700'
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                currency === 'USD'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-emerald-700'
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        {/* Cards — all equal, no "most popular" */}
        <div className="grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.level}
              className={`relative rounded-2xl border p-7 flex flex-col shadow-sm transition ${
                plan.comingSoon
                  ? 'border-zinc-200 bg-zinc-50'
                  : 'border-emerald-100 bg-white hover:shadow-md hover:border-emerald-200'
              }`}
            >
              {/* Coming Soon ribbon */}
              {plan.comingSoon && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  <Lock className="h-3 w-3" /> Coming Soon
                </span>
              )}

              {/* Badge */}
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm text-white mb-5 ${plan.comingSoon ? 'bg-zinc-400' : 'bg-emerald-700'}`}>
                {plan.badge}
              </div>

              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-600'}`}>
                {plan.level}
              </p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className={`text-4xl font-extrabold ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-900'}`}>
                  {currency === 'INR' ? plan.priceINR : plan.priceUSD}
                </span>
                <span className="mb-1 text-sm text-zinc-400">{plan.period}</span>
              </div>
              {currency === 'USD' && !plan.comingSoon && (
                <p className="text-[11px] text-zinc-400 -mt-1 mb-1">
                  International cards accepted via Razorpay
                </p>
              )}
              <p className="text-sm leading-6 text-zinc-500 mb-2">{plan.description}</p>

              {/* Access duration pill */}
              <div className="flex items-center gap-1.5 mb-6">
                <Clock className={`h-3.5 w-3.5 ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-600'}`} />
                <span className={`text-xs font-semibold ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-700'}`}>6 months access</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${plan.comingSoon ? 'text-zinc-300' : 'text-emerald-600'}`} />
                    <span className={`text-sm ${plan.comingSoon ? 'text-zinc-400' : 'text-zinc-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                <div className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-200 px-5 py-3 text-sm font-bold text-zinc-500">
                  <Lock className="h-4 w-4" /> Coming Soon
                </div>
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* No refund notice */}
        <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>No refund once enrollment is confirmed.</strong> Please use the free trial to evaluate the platform before purchasing.{' '}
            <Link href="/refund-policy" className="underline hover:text-red-900">Read our Refund Policy</Link>
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-white py-14 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-extrabold text-emerald-900">What&apos;s included in every plan</h2>
          <p className="mt-3 text-sm text-zinc-500">Every level plan gives you the full toolkit to prepare effectively.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 text-left">
            {[
              { title: 'Chapter-wise Study Notes', desc: 'Structured, exam-mapped notes for every chapter in your level.' },
              { title: '3,500+ MCQs Per Level', desc: 'Questions written at real CMT exam difficulty — not generic finance questions.' },
              { title: 'Unlimited Mock Tests', desc: 'Simulate the real exam experience as many times as you want.' },
              { title: 'Customised MCQ Tests', desc: 'Filter by chapter, topic, or difficulty. Build your own test sets.' },
              { title: 'Performance Analytics', desc: 'See exactly where you are strong and where you need more work.' },
              { title: 'Chartix Scholar', desc: 'Ask Chartix Scholar anything — trained on the CMT curriculum to explain concepts and answer your exam questions.' },
              { title: 'Progress Tracking', desc: 'Chapter-by-chapter completion tracking with streaks to keep you consistent.' },
              { title: '6 Months Access', desc: 'Your access is valid for 6 months — enough time for any exam window.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-[#f6fbf9] p-4">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f0f7f4] py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-emerald-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-emerald-100 bg-white p-5">
                <p className="font-semibold text-emerald-900 text-sm">{faq.q}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-900 py-14 text-center px-4">
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Try it free before you pay</h2>
        <p className="mt-3 text-emerald-300 text-sm">Create a free account to access sample notes and questions — no credit card required.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50">
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-200 transition hover:border-white hover:text-white">
            Contact us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-white py-6 text-center text-xs text-zinc-400 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
          <Link href="/privacy-policy" className="hover:text-emerald-700 transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-emerald-700 transition">Terms &amp; Conditions</Link>
          <Link href="/refund-policy" className="hover:text-emerald-700 transition">Refund Policy</Link>
          <Link href="/disclaimer" className="hover:text-emerald-700 transition">Disclaimer</Link>
          <Link href="/contact" className="hover:text-emerald-700 transition">Contact</Link>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Chartix. All rights reserved. Not affiliated with the CMT Association.</p>
      </footer>
    </div>
  );
}
