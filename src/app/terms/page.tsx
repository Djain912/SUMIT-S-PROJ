import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Chartix',
  description: 'Terms and Conditions for using the Chartix CMT Exam Prep platform.',
};

const LAST_UPDATED = 'June 1, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Terms & Conditions</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-a:underline">

          <p>Welcome to Chartix. By accessing or using our platform at <strong>chartix.in</strong>, you agree to be bound by these Terms and Conditions. Please read them carefully before using our services.</p>

          <h2>1. About Chartix</h2>
          <p>Chartix is an online education platform designed to help candidates prepare for the CMT (Chartered Market Technician) examination. We provide study notes, practice questions, quizzes, analytics, and AI-powered study assistance. Chartix is a Participating Prep Provider of the CMT Association under its Prep Provider Program; this participation does not constitute an endorsement or sponsorship of our products by the CMT Association, nor an authorized or exclusive partnership. CMT® and Chartered Market Technician® are registered trademarks owned by the CMT Association.</p>

          <h2>2. Eligibility</h2>
          <p>You must be at least 18 years of age to use Chartix. By creating an account, you confirm that you meet this requirement and that the information you provide is accurate and complete.</p>

          <h2>3. Account Responsibilities</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must not share your account with others or allow multiple people to use a single subscription.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Notify us immediately at <a href="mailto:support@chartix.in">support@chartix.in</a> if you suspect unauthorised access.</li>
          </ul>

          <h2>4. Subscription & Payments</h2>
          <ul>
            <li>Access to premium content requires a paid subscription.</li>
            <li>Payments are processed securely through Razorpay.</li>
            <li>Subscription fees are non-refundable except as specified in our Refund Policy.</li>
            <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
            <li>Subscriptions are for individual use only and are non-transferable.</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>All content on Chartix — including study notes, questions, explanations, UI design, and Chartix Scholar responses — is the intellectual property of Chartix or its licensors. You may not:</p>
          <ul>
            <li>Copy, reproduce, or distribute platform content without written permission.</li>
            <li>Screenshot or export questions for redistribution.</li>
            <li>Use our content for commercial purposes.</li>
            <li>Reverse-engineer or scrape the platform.</li>
          </ul>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the platform for any illegal or harmful purpose.</li>
            <li>Attempt to gain unauthorised access to any part of the platform.</li>
            <li>Upload malicious code or interfere with platform operations.</li>
            <li>Use Chartix Scholar to generate content for redistribution or to circumvent CMT exam rules.</li>
          </ul>

          <h2>7. Content Accuracy</h2>
          <p>While we make every effort to ensure the accuracy of our CMT study content, Chartix does not guarantee that all content is error-free or up-to-date with the latest CMT curriculum. Always verify critical exam information with the official CMT Association website (cmtassociation.org).</p>

          <h2>8. AI Study Assistant</h2>
          <p>Chartix Scholar, our AI study assistant, is powered by OpenAI&apos;s GPT models. Its responses are generated on demand and may occasionally contain inaccuracies, so always cross-reference them with the study notes and official sources. Our study notes are written and reviewed by our team.</p>

          <h2>9. Limitation of Liability</h2>
          <p>Chartix is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for:</p>
          <ul>
            <li>Exam failure or poor performance despite using our platform.</li>
            <li>Inaccuracies in study content.</li>
            <li>Temporary platform downtime or data loss.</li>
            <li>Third-party services (Razorpay, Google, OpenAI) failures.</li>
          </ul>

          <h2>10. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. Upon termination, access to premium content will cease immediately.</p>

          <h2>11. Governing Law</h2>
          <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>

          <h2>12. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised Terms.</p>

          <h2>13. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:support@chartix.in">support@chartix.in</a> or via our <a href="/contact">Contact page</a>.</p>
        </div>
      </div>
    </div>
  );
}
