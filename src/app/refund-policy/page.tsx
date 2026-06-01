import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Chartix',
  description: 'Refund and cancellation policy for Chartix CMT Exam Prep subscriptions.',
};

const LAST_UPDATED = 'June 1, 2026';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Refund & Cancellation Policy</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Key policy banner */}
        <div className="mb-8 rounded-2xl border-2 border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-800 text-base">No Refund Policy</p>
              <p className="mt-1 text-sm text-red-700 leading-6">
                All sales are final. Once enrollment is confirmed and payment is processed, <strong>no refunds will be issued</strong> under any circumstance, except for verified duplicate charges or verified platform-wide inaccessibility as described below. We strongly encourage you to use the free trial before purchasing.
              </p>
            </div>
          </div>
        </div>

        {/* Quick summary cards */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-emerald-800">Exceptions (Rare Cases Only)</p>
            </div>
            <ul className="space-y-1.5 text-sm text-emerald-700">
              <li>• Verified duplicate payment (charged twice)</li>
              <li>• Platform completely inaccessible for 7+ consecutive days due to our technical fault</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="font-semibold text-red-800">No Refund In All Other Cases</p>
            </div>
            <ul className="space-y-1.5 text-sm text-red-700">
              <li>• Change of mind after purchase</li>
              <li>• CMT exam failure or postponement</li>
              <li>• Partial or full usage of the platform</li>
              <li>• Dissatisfaction with content or AI features</li>
              <li>• Account suspended for policy violations</li>
              <li>• Request made after 48 hours of purchase</li>
            </ul>
          </div>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-a:underline">

          <h2>1. Overview</h2>
          <p>Chartix operates a <strong>strict no-refund policy</strong>. All payments made for CMT Level subscriptions on <strong>chartix.in</strong> are non-refundable once the enrollment is confirmed. By completing a payment, you acknowledge and agree to this policy.</p>
          <p>We offer a <strong>free trial</strong> before purchase so you can evaluate the platform content and features. We strongly recommend using the free trial before making a purchase decision.</p>

          <h2>2. No Refund After Enrollment</h2>
          <p>Once your payment is processed and your account is enrolled into a CMT level subscription:</p>
          <ul>
            <li>No refund will be issued, regardless of how much of the subscription period has been used.</li>
            <li>No refund will be issued for change of mind, dissatisfaction, or exam outcomes.</li>
            <li>No partial refunds will be issued for unused access time.</li>
            <li>No refunds will be issued for AI chatbot responses or automatically generated content.</li>
          </ul>

          <h2>3. Exceptions — When a Refund May Be Considered</h2>
          <p>A refund will <strong>only</strong> be considered in the following two situations, both of which must be verified by our team:</p>
          <ul>
            <li><strong>Duplicate charge:</strong> You were charged more than once for the exact same subscription, verified through Razorpay transaction records. Must be reported within 48 hours of purchase.</li>
            <li><strong>Platform inaccessibility:</strong> The Chartix platform is completely inaccessible to you for 7 or more consecutive days due to a fault on our end (not your device, browser, or internet connection), verified by our engineering team.</li>
          </ul>
          <p>All other situations — including but not limited to exam failure, schedule changes, content dissatisfaction, or personal circumstances — do not qualify for a refund.</p>

          <h2>4. How to Report an Exception</h2>
          <p>If you believe your situation qualifies under Section 3, email us at <a href="mailto:support@chartix.in">support@chartix.in</a> within 48 hours of the issue occurring with:</p>
          <ul>
            <li>Your registered email address</li>
            <li>Razorpay payment/transaction ID</li>
            <li>Description of the issue</li>
            <li>Supporting evidence (screenshots, transaction receipts)</li>
          </ul>
          <p>We will review your case within <strong>3 business days</strong> and communicate our decision. Approval is at our sole discretion.</p>

          <h2>5. Approved Exception Processing Time</h2>
          <p>If an exception is approved, the refund will be processed within <strong>5–7 business days</strong> to the original payment method. Processing times may vary depending on your bank or card provider.</p>

          <h2>6. Subscription Cancellation</h2>
          <p>You may stop using the platform at any time, but cancellation does not trigger a refund. Your access continues until the end of your 6-month subscription period.</p>

          <h2>7. Disputes via Razorpay or Bank</h2>
          <p>If you raise a chargeback or dispute directly with Razorpay or your bank without first contacting us, it may delay resolution and result in your account being suspended. Please contact us first at <a href="mailto:support@chartix.in">support@chartix.in</a>.</p>

          <h2>8. Free Trial Before Purchase</h2>
          <p>Before enrolling, we encourage all users to:</p>
          <ul>
            <li>Sign up for a free account at <a href="/sign-up">chartix.in/sign-up</a></li>
            <li>Explore the sample notes, questions, and interface</li>
            <li>Confirm the platform meets your requirements</li>
          </ul>
          <p>The availability of a free trial means there is no basis for a refund claim on grounds of not knowing what the platform contains.</p>

          <h2>9. Contact</h2>
          <p>For policy queries, contact us at <a href="mailto:support@chartix.in">support@chartix.in</a> or via our <a href="/contact">Contact page</a>. We aim to respond within 24 hours on business days (Monday–Friday).</p>
        </div>
      </div>
    </div>
  );
}
