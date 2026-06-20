import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CMT Exam Prep Pricing | Chartix — Level I, II & III Plans',
  description:
    'Affordable CMT exam prep plans for every level. Get access to structured notes, 3,500+ MCQs per level, mock tests, analytics, and the Chartix Scholar AI chatbot. Start preparing today.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Chartix Pricing — CMT Exam Prep Plans',
    description:
      'CMT Level I, II & III prep plans with notes, practice quizzes, mock tests, analytics, and AI chatbot. Affordable, India-priced.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chartix Pricing — CMT Exam Prep Plans',
    description:
      'CMT Level I, II & III prep plans with notes, practice quizzes, mock tests and AI chatbot.',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
