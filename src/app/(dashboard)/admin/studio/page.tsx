import type { Metadata } from 'next';
import { Instagram } from 'lucide-react';
import { StudioClient } from '@/components/admin/StudioClient';

export const metadata: Metadata = {
  title: 'Studio | Admin — Chartix',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Social Studio — generates the daily Instagram / LinkedIn carousel.
 * Access is already restricted: every page under (dashboard)/admin runs
 * requireAdminUser() in the admin layout.
 */
export default function StudioPage() {
  return (
    <>
      {/* Carousel typography. Self-hosted, SIL Open Font Licence. */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
@font-face{font-family:'StudioSerif';src:url('/fonts/studio/InstrumentSerif-Regular.woff2') format('woff2');font-weight:400;font-display:block;}
@font-face{font-family:'StudioSans';src:url('/fonts/studio/Manrope-Variable.woff2') format('woff2');font-weight:200 800;font-display:block;}
@font-face{font-family:'StudioHand';src:url('/fonts/studio/Caveat-Variable.woff2') format('woff2');font-weight:400 700;font-display:block;}
`,
        }}
      />

      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-2 text-zinc-900">
            <Instagram className="h-5 w-5" />
            <h1 className="text-xl font-semibold tracking-tight">Social Studio</h1>
          </div>
          <p className="mt-1.5 text-sm text-zinc-500">
            Generate the daily carousel, preview it, and download print-ready
            1080×1350 PNGs. Themes and layouts rotate automatically so the feed
            never looks repetitive.
          </p>
        </header>

        <StudioClient logoUrl="/studio-logo.png" />
      </div>
    </>
  );
}
