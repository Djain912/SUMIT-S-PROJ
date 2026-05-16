import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import { Providers } from '@/components/providers';
import { AppNavbar } from '@/components/shared/app-navbar';
import { PageProgress } from '@/components/shared/page-progress';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CMT Prep — Exam Preparation for CMT Candidates',
    template: '%s — CMT Prep',
  },
  description: 'Structured study notes, adaptive quizzes, and deep analytics for CMT Level I, II, and III candidates.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <Suspense fallback={null}>
            <PageProgress />
          </Suspense>
          <AppNavbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
