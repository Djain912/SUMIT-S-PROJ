import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Chartix',
  description: 'Privacy Policy for Chartix CMT Exam Prep platform.',
};

const LAST_UPDATED = 'June 1, 2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Legal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-a:underline">

          <p>Chartix (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the website <strong>chartix.in</strong>. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.</p>

          <h2>1. Information We Collect</h2>
          <h3>Information you provide</h3>
          <ul>
            <li><strong>Account details:</strong> Name, email address, and password when you register.</li>
            <li><strong>Google OAuth:</strong> If you sign in with Google, we receive your name and email address from Google.</li>
            <li><strong>Contact form:</strong> Name, email, mobile number, and message when you contact us.</li>
            <li><strong>Payment information:</strong> Billing details processed securely through Razorpay. We do not store card numbers on our servers.</li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li>IP address and browser type for security and rate-limiting purposes.</li>
            <li>Quiz attempt data, performance scores, and study progress.</li>
            <li>Pages visited and features used to improve the platform.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account.</li>
            <li>To provide access to CMT study notes, quizzes, and analytics.</li>
            <li>To process payments and send receipts.</li>
            <li>To send important platform updates and announcements.</li>
            <li>To respond to customer support queries.</li>
            <li>To improve platform features and content quality.</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>We do <strong>not</strong> sell, rent, or trade your personal information. We share data only with:</p>
          <ul>
            <li><strong>Razorpay:</strong> For payment processing.</li>
            <li><strong>Google:</strong> For OAuth authentication (if you choose Google sign-in).</li>
            <li><strong>OpenAI:</strong> Your chat messages are processed by OpenAI to generate AI responses. We do not use your data to train OpenAI models.</li>
            <li><strong>Neon / Vercel:</strong> Infrastructure providers hosting our database and application.</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>We implement industry-standard security measures including HTTPS encryption, hashed passwords, and access controls. However, no system is 100% secure. We encourage you to use a strong, unique password.</p>

          <h2>5. Cookies</h2>
          <p>We use session cookies for authentication purposes. No third-party advertising cookies are used. You may disable cookies in your browser settings, but this may affect platform functionality.</p>

          <h2>6. Your Rights</h2>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data.</li>
            <li><strong>Correction:</strong> Update inaccurate information.</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data.</li>
            <li><strong>Portability:</strong> Request your quiz and progress data in a portable format.</li>
          </ul>
          <p>To exercise these rights, email us at <a href="mailto:support@chartix.in">support@chartix.in</a>.</p>

          <h2>7. Data Retention</h2>
          <p>We retain your account data for as long as your account is active. Deleted accounts are purged from our systems within 30 days. Payment records may be retained for up to 7 years as required by Indian tax law.</p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>Chartix is intended for users aged 18 and above. We do not knowingly collect data from children under 18.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the platform. Continued use of Chartix after changes constitutes acceptance of the updated policy.</p>

          <h2>10. Contact Us</h2>
          <p>For privacy-related queries, contact us at:</p>
          <ul>
            <li>Email: <a href="mailto:support@chartix.in">support@chartix.in</a></li>
            <li>Website: <a href="/contact">chartix.in/contact</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
