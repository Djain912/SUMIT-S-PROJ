import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer | Chartix',
  description: 'Important disclaimer regarding Chartix and its relationship with the CMT Association.',
};

const LAST_UPDATED = 'June 2026';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Disclaimer</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Key banner */}
        <div className="mb-10 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-base">Independent Preparation Platform</p>
              <p className="mt-1 text-sm text-amber-700 leading-6">
                Chartix is an <strong>independent, privately owned</strong> exam preparation platform. We are <strong>not affiliated with, endorsed by, sponsored by, or in any way connected to</strong> the CMT Association or any of its subsidiaries, affiliates, or representatives.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-a:underline">

          <h2>1. No Affiliation with the CMT Association</h2>
          <p>
            Chartix (chartix.in) is an independent exam preparation service. The Chartered Market Technician (CMT®) designation and the CMT Association® are registered trademarks of the CMT Association, Inc. The use of these terms on this platform is solely for descriptive and informational purposes — to identify the examination for which our study materials are designed. Such use does not imply any affiliation with, endorsement by, or approval from the CMT Association.
          </p>

          <h2>2. No Guarantee of Exam Success</h2>
          <p>
            Chartix makes no representation or warranty that use of our platform will result in passing the CMT examination or obtaining the CMT charter. Exam outcomes depend entirely on individual preparation, effort, and the discretion of the CMT Association. Our materials are designed to supplement — not replace — a candidate&apos;s own study programme.
          </p>

          <h2>3. Content Accuracy</h2>
          <p>
            While we make every effort to ensure that the content on Chartix is accurate and up to date with the current CMT curriculum, we cannot guarantee that all information is complete, current, or error-free. The CMT Association may update the official curriculum, syllabus, exam format, fees, or eligibility requirements at any time. Candidates should always verify the latest information directly from the official CMT Association website at{' '}
            <a href="https://cmtassociation.org" target="_blank" rel="noopener noreferrer">cmtassociation.org</a>.
          </p>

          <h2>4. Original Content</h2>
          <p>
            All study notes, practice questions, explanations, and other learning materials published on Chartix are created independently by the Chartix team. They represent our own interpretation and presentation of technical analysis concepts and CMT curriculum topics. Any resemblance to official CMT Association materials is incidental and reflects the common body of knowledge in technical analysis.
          </p>

          <h2>5. AI-Generated Content</h2>
          <p>
            Chartix Scholar is an AI-powered study assistant built on the CMT curriculum. Responses may occasionally contain errors, outdated information, or interpretations that differ from official CMT Association guidance. Always cross-reference Chartix Scholar responses with official sources before relying on them for exam preparation.
          </p>

          <h2>6. Not Financial or Investment Advice</h2>
          <p>
            The technical analysis concepts, examples, and market discussions on Chartix are provided solely for educational purposes related to the CMT examination. Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy or sell any security or financial instrument. Chartix and its team are not registered investment advisers.
          </p>

          <h2>7. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites including the CMT Association, publishers, and other resources. These links are provided for convenience only. Chartix has no control over the content, accuracy, or availability of third-party websites and accepts no responsibility for them.
          </p>

          <h2>8. Trademark Notice</h2>
          <p>
            CMT® and Chartered Market Technician® are registered trademarks of the CMT Association, Inc. All other trademarks, service marks, and trade names referenced on this site are the property of their respective owners. Chartix does not claim ownership of any third-party marks.
          </p>

          <h2>9. Contact</h2>
          <p>
            If you have any questions about this disclaimer or believe any content on our platform infringes your rights, please contact us at{' '}
            <a href="mailto:support@chartix.in">support@chartix.in</a> or via our{' '}
            <a href="/contact">Contact page</a>. We will respond within 2 business days.
          </p>

        </div>

        <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
          <p>
            <strong className="text-zinc-700">Summary:</strong> Chartix is a student-built, independent CMT prep platform.
            CMT® is a registered trademark of the CMT Association — we are not them, we are not endorsed by them,
            and we are not affiliated with them in any way. We just help you prepare.
          </p>
        </div>

      </div>
    </div>
  );
}
