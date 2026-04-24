import type { Metadata } from 'next';
import { AppNavbar } from '@/components/shared/app-navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Finance Exam Platform',
  description: 'A scalable learning and quiz platform for finance exam preparation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppNavbar />
        {children}
      </body>
    </html>
  );
}
