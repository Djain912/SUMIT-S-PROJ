import { resend, FROM_EMAIL, BCC_EMAIL } from './resend';

const GREEN = '#0f5c35';
const GRAY = '#6b7280';
const DARK = '#111827';
const BODY = '#374151';
const BORDER = '#e5e7eb';
const BG_LIGHT = '#f0faf4';

function featureCard(icon: string, title: string, desc: string) {
  return `
  <tr><td style="padding:0 0 10px">
    <table style="border-collapse:collapse;width:100%;border:0.5px solid ${BORDER};border-radius:8px">
      <tr>
        <td style="padding:14px 12px;width:44px;vertical-align:top">
          <div style="width:32px;height:32px;background:${BG_LIGHT};border-radius:6px;text-align:center;line-height:32px;font-size:16px">${icon}</div>
        </td>
        <td style="padding:14px 12px 14px 0;vertical-align:top">
          <p style="margin:0;font-size:13px;font-weight:600;color:${DARK}">${title}</p>
          <p style="margin:3px 0 0;font-size:12px;color:${GRAY}">${desc}</p>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function buildHtml({
  firstName,
  headline,
  subline,
  introLine,
  showOffer,
}: {
  firstName: string;
  headline: string;
  subline: string;
  introLine: string;
  showOffer: boolean;
}) {
  const offerBlock = showOffer ? `
  <tr><td style="padding:0 0 24px">
    <table style="border-collapse:collapse;width:100%;background:${BG_LIGHT};border-left:3px solid ${GREEN};border-radius:4px">
      <tr><td style="padding:12px 16px">
        <p style="margin:0;font-size:12px;color:${GREEN};font-weight:700">LAUNCH OFFER — FIRST 10 USERS</p>
        <p style="margin:4px 0 0;font-size:12.5px;color:${BODY}">Use code <strong>CHARTIX10</strong> when upgrading for <strong>50% off</strong> full premium access.</p>
      </td></tr>
    </table>
  </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${headline}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table style="border-collapse:collapse;width:100%;background:#f4f4f5" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 16px">
<table style="border-collapse:collapse;max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">

  <!-- Header -->
  <tr><td style="background:${GREEN};padding:28px 32px;text-align:center">
    <img src="https://chartix.in/chartix-wordmark.png" alt="Chartix" height="28" style="display:inline-block;filter:brightness(0) invert(1)" />
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 32px 24px">
    <table style="border-collapse:collapse;width:100%">

      <!-- Headline -->
      <tr><td style="padding:0 0 6px">
        <p style="margin:0;font-size:22px;font-weight:700;color:${DARK};letter-spacing:-0.3px">${headline}</p>
      </td></tr>
      <tr><td style="padding:0 0 24px">
        <p style="margin:0;font-size:13.5px;color:${BODY};line-height:1.6">${subline}</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:0 0 20px">
        <p style="margin:0;font-size:14px;color:${BODY};line-height:1.7">Hi ${firstName},<br><br>${introLine}</p>
      </td></tr>

      <!-- Start here label -->
      <tr><td style="padding:0 0 10px">
        <p style="margin:0;font-size:12px;font-weight:700;color:${DARK};text-transform:uppercase;letter-spacing:0.6px">Start here</p>
      </td></tr>

      <!-- Feature cards -->
      ${featureCard('📝', 'Study Notes', 'Structured, exam-focused notes for every CMT topic — written to the point.')}
      ${featureCard('❓', 'Practice Questions', 'Topic-wise Q&amp;A built around the CMT curriculum. Do at least 20 daily.')}
      ${featureCard('🤖', 'Chartix Scholar', 'AI chatbot trained on technical analysis &amp; CMT material. Ask it anything.')}
      ${featureCard('📋', 'Mock Tests', 'Full-length timed tests that simulate real exam conditions.')}
      ${featureCard('📊', 'Smart Analytics', 'AI-powered performance tracking — see exactly where you\'re strong and where to improve.')}

      <!-- CTA -->
      <tr><td style="padding:24px 0;text-align:center">
        <a href="https://chartix.in/user/notes" style="display:inline-block;background:${GREEN};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 32px;border-radius:8px">Start with Chapter 1 →</a>
      </td></tr>

      <!-- Offer (trial only) -->
      ${offerBlock}

      <!-- Feedback -->
      <tr><td style="padding:0 0 24px">
        <p style="margin:0 0 4px;font-size:14px;color:${BODY}">We'd love to hear how your experience goes:</p>
        <a href="https://chartix.in/feedback" style="font-size:13px;color:${GREEN};font-weight:600;text-decoration:none">chartix.in/feedback →</a>
      </td></tr>

      <!-- Signature -->
      <tr><td style="border-top:0.5px solid ${BORDER};padding-top:20px">
        <p style="margin:0;font-size:13px;font-weight:600;color:${DARK}">Sumit Jain</p>
        <p style="margin:3px 0;font-size:12px;color:${GREEN}">Founder, Chartix.in</p>
        <p style="margin:3px 0 0;font-size:11.5px;color:#9ca3af">CMT Level III Cleared · Equity Research Analyst</p>
      </td></tr>

    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-top:0.5px solid ${BORDER};padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">
      © 2026 Chartix.in &nbsp;·&nbsp;
      <a href="https://www.instagram.com/chartix.in" style="color:#9ca3af;text-decoration:none">Instagram</a> &nbsp;·&nbsp;
      <a href="https://chartix.in/blog" style="color:#9ca3af;text-decoration:none">Blog</a>
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#d1d5db">You received this because you signed up on chartix.in</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

export async function sendTrialWelcomeEmail(email: string, fullName: string | null | undefined) {
  const firstName = extractFirstName(fullName);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: 'Your Chartix free trial is live 🎉',
    html: buildHtml({
      firstName,
      headline: 'Your free trial is live. 🎉',
      subline: 'Your 7-day access starts now — everything you need to prepare for the CMT exam is ready.',
      introLine: 'Thank you for starting your free trial. We\'re excited to have you on board and look forward to helping you prepare with confidence.',
      showOffer: true,
    }),
  });
}

export async function sendTrialNudgeEmail(email: string, fullName: string | null | undefined, daysRemaining: number) {
  const firstName = extractFirstName(fullName);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: `You haven't started yet — ${daysRemaining} days left on your trial`,
    html: buildHtml({
      firstName,
      headline: 'Your trial is running. Have you started?',
      subline: `You still have ${daysRemaining} days left — enough time to get a real feel for CMT preparation.`,
      introLine: `You signed up a couple of days ago but haven't opened any notes yet. No pressure — but your trial clock is running, and we don't want you to miss out.<br><br>Here's the quickest way to get started: open the first chapter, read for 10 minutes, then try a few practice questions. That's it.`,
      showOffer: true,
    }),
  });
}

export async function sendTrialUrgencyEmail(email: string, fullName: string | null | undefined) {
  const firstName = extractFirstName(fullName);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: '1 day left on your Chartix trial',
    html: buildHtml({
      firstName,
      headline: '1 day left on your trial.',
      subline: 'Your 7-day free trial ends tomorrow. Here\'s how to make the most of it — or upgrade to keep going.',
      introLine: `Your free trial expires in about 24 hours. If you haven't had a chance to explore yet, today is the day.<br><br>If you've been using Chartix and want to continue, upgrading takes 2 minutes and keeps all your progress intact.`,
      showOffer: true,
    }),
  });
}

export async function sendPremiumWelcomeEmail(email: string, fullName: string | null | undefined) {
  const firstName = extractFirstName(fullName);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: 'Welcome to Chartix Premium 🎉',
    html: buildHtml({
      firstName,
      headline: 'Welcome to Chartix Premium. 🎉',
      subline: 'Your full access is now unlocked — everything you need to prepare for the CMT exam is ready.',
      introLine: 'Thank you for choosing us to be part of your CMT journey. We\'re excited to have you on board and look forward to helping you prepare with confidence.',
      showOffer: false,
    }),
  });
}
