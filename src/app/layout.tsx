import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from '@/components/providers';
import { AppNavbar } from '@/components/shared/app-navbar';
import { PageProgress } from '@/components/shared/page-progress';
import { siteConfig } from '@/lib/site';
import './globals.css';

// Google Analytics 4 measurement ID. Defaults to the live Chartix property; a
// GA ID is public (it ships in every page), so it's safe to hard-code. Can be
// overridden per-environment via NEXT_PUBLIC_GA_ID without a code change.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-GM1X54JGTL';

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
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: 'education',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
        <Analytics />
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  );
}
