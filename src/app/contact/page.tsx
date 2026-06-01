import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Clock, MapPin, TrendingUp, MessageSquare } from 'lucide-react';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | Chartix',
  description: "Have a question about Chartix or the CMT exam? We're here to help. Reach out and we'll get back to you within 1–2 business days.",
  alternates: { canonical: '/contact' },
};

const INFO_ITEMS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@chartix.in',
    href: 'mailto:contact@chartix.in',
  },
  {
    icon: Clock,
    label: 'Response time',
    value: '1–2 business days',
    href: null,
  },
  {
    icon: MapPin,
    label: 'Based in',
    value: 'India',
    href: null,
  },
];

const FAQ_ITEMS = [
  {
    q: 'Which CMT levels does Chartix cover?',
    a: 'Chartix covers all three CMT levels — Level I, Level II, and Level III — with structured notes, quizzes, and analytics for each.',
  },
  {
    q: 'How do I access study notes and quizzes?',
    a: 'Create a free account to get started. Premium access unlocks all levels, detailed analytics, and the AI-powered tutor.',
  },
  {
    q: 'I found an error in a question or note. What should I do?',
    a: 'You can report it directly from the platform using the report button next to any question or note. We review all reports promptly.',
  },
  {
    q: 'Is there a refund policy?',
    a: "Yes. If you're not satisfied within 7 days of purchase, contact us and we'll process a full refund — no questions asked.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-zinc-100 bg-zinc-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-zinc-950">Chartix</span>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-500">
            Questions about the platform, courses, or your subscription? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-5">

            {/* Left column — contact info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Contact info</h2>
                <ul className="mt-5 space-y-4">
                  {INFO_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                          <Icon className="h-4 w-4 text-zinc-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-400">{item.label}</p>
                          {item.href ? (
                            <a href={item.href} className="text-sm font-medium text-zinc-900 hover:underline">
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-zinc-900">{item.value}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* FAQ */}
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Common questions</h2>
                <div className="mt-5 space-y-5">
                  {FAQ_ITEMS.map((item) => (
                    <div key={item.q} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-start gap-2.5">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{item.q}</p>
                          <p className="mt-1.5 text-sm leading-6 text-zinc-500">{item.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column — form */}
            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
