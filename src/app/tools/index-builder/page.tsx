import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Custom Index Builder — Build Market-Cap & Equal-Weight Indices | Chartix',
  description:
    'Free tool to build your own custom stock index from 4,900+ NSE/BSE stocks. Choose market-cap or equal weighting, set a base value and date range, and chart your index with indicators — no login required.',
  alternates: { canonical: '/tools/index-builder' },
  openGraph: {
    title: 'Custom Index Builder — Chartix',
    description:
      'Build and chart your own market-cap or equal-weighted stock index from 4,900+ Indian stocks. Free, no login.',
    url: '/tools/index-builder',
  },
};

export default function IndexBuilderPage() {
  return (
    <>
      {/* SEO heading (visually hidden — the interactive tool fills the screen) */}
      <h1 className="sr-only">
        Chartix Custom Index Builder — build market-cap and equal-weighted stock indices
      </h1>
      <iframe
        src="/index-builder-app/index.html"
        title="Chartix Index Builder"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
      />
    </>
  );
}
