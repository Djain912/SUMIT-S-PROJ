import { NextResponse } from 'next/server';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { getCumulativeFlow, getSectorSnapshot } from '@/lib/reports/fii-dii-data';
import { renderReportPng } from '@/lib/reports/render';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Vercel calls this on schedule (see vercel.json):
//   ?period=weekly  - every Monday
//   ?period=monthly - 1st of the month
// Renders the report PNG with real data (no LLM) and emails it as an
// attachment - "auto-generate, you post manually" per the chosen workflow.
// Protected by CRON_SECRET, same pattern as /api/cron/fii-dii-log.

const REPORTS_TO = process.env.REPORTS_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? 'contact@chartix.in';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') === 'monthly' ? 'monthly' : 'weekly';
  const days = period === 'monthly' ? 30 : 7;

  try {
    const cumulative = await getCumulativeFlow(days);
    if (!cumulative) {
      return NextResponse.json({ ok: false, reason: 'no cash-flow data in range' }, { status: 200 });
    }
    const sector = await getSectorSnapshot();

    const bytes = await renderReportPng({ kind: period, cumulative, sector });
    const filename = `chartix-fii-dii-${period}-${cumulative.toDate}.png`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: REPORTS_TO,
      subject: `${period === 'weekly' ? 'Weekly' : 'Monthly'} FII/DII report — ready to post (${cumulative.periodLabel})`,
      html: `<p>Your ${period} FII/DII report is attached, generated from live data.</p>
<p><strong>Period:</strong> ${cumulative.periodLabel} (${cumulative.sessionCount} sessions)<br/>
<strong>FII Net:</strong> ₹${cumulative.fiiNetCr.toLocaleString('en-IN')} Cr<br/>
<strong>DII Net:</strong> ₹${cumulative.diiNetCr.toLocaleString('en-IN')} Cr</p>
${sector ? `<p>Sector table uses NSDL data as of ${sector.asOf ?? 'the last available fortnight'} (source: ${sector.source === 'github' ? 'live feed' : 'local fallback — check the live feed if this looks stale'}).</p>` : '<p>Sector data was unavailable when this ran — the image shows cash flows only.</p>'}
<p>Download the PNG below and post it whenever you're ready.</p>`,
      attachments: [{ filename, content: Buffer.from(bytes).toString('base64') }],
    });

    return NextResponse.json({ ok: true, period, periodLabel: cumulative.periodLabel, sectorSource: sector?.source ?? null });
  } catch (error) {
    console.error('[cron/fii-dii-report] failed:', error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
