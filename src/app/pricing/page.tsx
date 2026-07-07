import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, Clock, AlertCircle, Lock, Shield, X } from 'lucide-react';
import { getVisitorCurrency } from '@/lib/geo/country';

const plansData = [
  {
    level: 'CMT Level 1',
    badge: 'L1',
    comingSoon: false,
    priceINR: '₹6,999',
    priceUSD: '$99',
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
    priceUSD: '$99',
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
    priceUSD: '$99',
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
    q: "What's included in the free trial?",
    a: "Your free trial gives you 7 days of access to chapter-wise notes, practice MCQs, one full mock test, and 10 daily questions on Chartix Scholar — our AI tutor. No credit card required. You'll see exactly what the platform is like before committing.",
  },
  {
    q: 'What if Level 2 content is not ready when I need it?',
    a: "Level 2 and 3 are listed as Coming Soon. If you've purchased Level 1 and need Level 2 content, reach out — we'll notify you the moment it's available and honour any early-adopter pricing.",
  },
  {
    q: 'Is there a refund policy?',
    a: 'There is no refund once enrollment is confirmed. Please use the free trial to thoroughly evaluate the platform before purchasing. Exceptions are made only for verified duplicate charges or platform-wide technical failures.',
  },
  {
    q: 'How is Chartix different from reading the official CMT books?',
    a: 'The official books cover the breadth of the curriculum but are dense and exam-format practice is limited. Chartix distils each chapter into focused study notes, gives you 3,500+ exam-grade MCQs (not generic questions), tracks exactly which topics you are weak in, and gives you an AI tutor that explains concepts instantly — accelerating your revision significantly.',
  },
  {
    q: 'Can I access on mobile?',
    a: 'Yes. Chartix is fully responsive and works on any device — phone, tablet, or desktop. Study on your commute, at your desk, or anywhere in between.',
  },
  {
    q: 'Can I access all three levels with one payment?',
    a: 'Each level is priced and sold separately. You purchase access to the specific CMT level you are currently preparing for. There is no bundled plan.',
  },
  {
    q: 'How long is the access valid?',
    a: 'Access is valid for 6 months from the date of purchase — ample time for any CMT exam window.',
  },
];

const comparisonRows = [
  { feature: 'Chapter-wise Notes', free: 'First few chapters', paid: 'All chapters — all levels' },
  { feature: 'Practice Questions', free: 'Limited', paid: '3,500+ per level' },
  { feature: 'Mock Tests', free: '1 full mock test', paid: 'Unlimited' },
  { feature: 'Chartix Scholar AI', free: '10 questions/day', paid: 'Unlimited' },
  { feature: 'Performance Analytics', free: 'Limited', paid: 'Full chapter-by-chapter' },
  { feature: 'CMT Levels', free: 'Level 1 only', paid: 'Level 1, 2 & 3' },
  { feature: 'Price', free: '₹0', paid: '₹6,999 / $99 per level' },
];

export default async function PricingPage() {
  const currency = await getVisitorCurrency();
  const isUSD = currency === 'USD';

  return (
    <div className="min-h-screen bg-[#f0f7f4]">

      {/* Early Adopter Banner */}
      <div className="bg-emerald-700 text-white text-center px-4 py-3 text-sm font-medium">
        🎓 Early Adopter Pricing — First 10 students get 50% off. Use code{' '}
        <span className="font-bold bg-white/20 rounded px-2 py-0.5 mx-1 tracking-widest">CHARTIX10</span>
        {' '}at checkout.
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-emerald-100 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/chartix-wordmark.png" alt="Chartix" width={132} height={34} priority />
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
            Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
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
          No bundles, no confusion. Try free first — then choose the CMT level you&apos;re preparing for.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-emerald-700 px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600"
          >
            Start Free — Notes, Questions, Mock Tests &amp; AI Tutor Included <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-400">No credit card required · 7-day free trial</p>

        {/* Important notice */}
        <div className="mt-6 inline-flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-left max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Each plan gives access to that level only.</strong> Buying Level 1 does not include Level 2 or 3 content. Access is valid for 6 months.
          </p>
        </div>
      </section>

      {/* Free vs Paid comparison table */}
      <section className="bg-white border-t border-zinc-100 py-14 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-extrabold text-emerald-900 text-center mb-2">What&apos;s Free vs Paid</h2>
          <p className="text-center text-sm text-zinc-500 mb-8">Try everything for free, then upgrade when you&apos;re ready.</p>
          <div className="overflow-hidden rounded-2xl border border-emerald-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50">
                  <th className="px-5 py-3.5 text-left font-semibold text-emerald-900"></th>
                  <th className="px-5 py-3.5 text-center font-semibold text-emerald-700">Free Trial</th>
                  <th className="px-5 py-3.5 text-center font-semibold text-emerald-900 bg-emerald-100/60">Full Access</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                    <td className="px-5 py-3.5 font-medium text-zinc-800">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center text-zinc-500">{row.free}</td>
                    <td className="px-5 py-3.5 text-center font-semibold text-emerald-700 bg-emerald-50/40">{row.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {plansData.map((plan) => (
            <div
              key={plan.level}
              className={`relative rounded-2xl border p-7 flex flex-col shadow-sm transition ${
                plan.comingSoon
                  ? 'border-zinc-200 bg-zinc-50'
                  : 'border-emerald-100 bg-white hover:shadow-md hover:border-emerald-200'
              }`}
            >
              {plan.comingSoon && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  <Lock className="h-3 w-3" /> Coming Soon
                </span>
              )}

              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm text-white mb-5 ${plan.comingSoon ? 'bg-zinc-400' : 'bg-emerald-700'}`}>
                {plan.badge}
              </div>

              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-600'}`}>
                {plan.level}
              </p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className={`text-4xl font-extrabold ${plan.comingSoon ? 'text-zinc-400' : 'text-emerald-900'}`}>
                  {isUSD ? plan.priceUSD : plan.priceINR}
                </span>
                <span className="mb-1 text-sm text-zinc-400">{plan.period}</span>
              </div>
              <p className="text-sm leading-6 text-zinc-500 mb-2">{plan.description}</p>

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
                <div className="space-y-2">
                  <Link
                    href="/sign-up"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                  >
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/get-access"
                    className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition py-1"
                  >
                    or Purchase Full Access — {isUSD ? '$99' : '₹6,999'}
                  </Link>
                  {/* Guarantee badge */}
                  <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 mt-1">
                    <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] font-medium text-emerald-700">7-Day Money-Back Guarantee — Full refund, no questions asked</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No refund notice — kept for transparency */}
        <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>7-day money-back guarantee.</strong> After 7 days, no refund once enrollment is confirmed. Please use the free trial to evaluate the platform before purchasing.{' '}
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
        <p className="mt-3 text-emerald-300 text-sm">Chapter notes, practice questions, mock test & Chartix Scholar AI — all included in your free trial.</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
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
        <div className="mt-4 flex items-center justify-center gap-3">
          <Image src="/cmt-prep-provider-badge.png" alt="CMT Association Participating Prep Provider" width={56} height={56} />
          <p className="max-w-md text-left text-[11px] leading-5 text-zinc-400">
            Chartix is a <strong className="font-semibold text-zinc-500">Participating Prep Provider</strong> of the CMT Association. CMT® is a registered trademark of the CMT Association.
          </p>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Chartix. All rights reserved.</p>
      </footer>
    </div>
  );
}
