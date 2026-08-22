import type { Metadata } from 'next';
import { StudioTabs } from '@/components/admin/StudioTabs';
import { prisma } from '@/lib/db/prisma';

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
export default async function StudioPage() {
  const today = new Date().toISOString().slice(0, 10);
  const observations = await prisma.marketObservation.findMany({
    where: { date: today },
    orderBy: { score: 'desc' },
  });
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

      <StudioTabs logoUrl="/studio-logo.png" initialObs={observations} />
    </>
  );
}
