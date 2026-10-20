import type { Metadata } from 'next';
import { StudioTabs } from '@/components/admin/StudioTabs';
import { prisma } from '@/lib/db/prisma';
import { withLogo } from '@/lib/observations/logo';
import { telegramConfigured } from '@/lib/telegram';

export const metadata: Metadata = {
  title: 'Studio | Admin — Chartix',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Social Studio — the daily Market Desk posts for X, the Instagram / LinkedIn
 * carousel, and FII/DII reports.
 * Access is already restricted: every page under (dashboard)/admin runs
 * requireAdminUser() in the admin layout.
 */
export default async function StudioPage() {
  // Latest Market Desk run (today's, or the most recent one if today's hasn't run).
  const latest = await prisma.marketObservation.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
  const [rows, breadth, fii] = await Promise.all([
    latest ? prisma.marketObservation.findMany({ where: { date: latest.date }, orderBy: { score: 'desc' } }) : [],
    prisma.breadthDaily.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
    prisma.fiiDiiLog.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
  ]);
  const observations = rows.map((o) => ({ ...o, chartSvg: withLogo(o.chartSvg) }));
  const status = { breadthDate: breadth?.date ?? null, fiiDate: fii?.date ?? null, telegramReady: telegramConfigured() };
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

      <StudioTabs logoUrl="/studio-logo.png" initialObs={observations} status={status} />
    </>
  );
}
