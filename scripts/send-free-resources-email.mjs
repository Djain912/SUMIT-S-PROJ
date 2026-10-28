// Send free CMT resources email to all users
// node scripts/send-free-resources-email.mjs

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Exclude list lives in a git-ignored file (repo is public).
const EXCLUDE = new Set(
  JSON.parse(readFileSync('scripts/private-email-lists.json', 'utf-8')).freeResourcesExclude.map((e) => e.toLowerCase())
);

// Anyone who asked to unsubscribe (scripts/email-unsubscribed.json) is never emailed.
for (const u of JSON.parse(readFileSync('scripts/email-unsubscribed.json', 'utf-8')).unsubscribed) EXCLUDE.add(u.email.toLowerCase());

const FROM = 'Chartix <contact@chartix.in>';
const CC = 'chartix2026@gmail.com';

function html(name) {
  const firstName = (name || 'there').split(' ')[0];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#064e3b;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Chartix</p>
          <p style="margin:4px 0 0;color:#6ee7b7;font-size:12px;">CMT Exam Prep Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">Your free CMT prep material is here</h1>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">A better way to prepare for the CMT exams.</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">We've brought together a growing collection of study guides, formula sheets, and practice questions to help you prepare for the CMT curriculum — all in one place. And it's completely free to access.</p>

          <!-- CMT Foundations -->
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#064e3b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">CMT Foundations</p>
          <ul style="padding-left:20px;margin:0 0 20px;">
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/dow-theory-foundation-of-technical-analysis" style="color:#2563eb;text-decoration:none;font-size:14px;">Dow Theory</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/what-is-a-trend-the-foundation-of-technical-analysis" style="color:#2563eb;text-decoration:none;font-size:14px;">Understanding Trends</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/chart-types-line-bar-candlestick-point-and-figure" style="color:#2563eb;text-decoration:none;font-size:14px;">The Four Chart Types</a></li>
          </ul>

          <!-- CMT Level I -->
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#064e3b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">CMT Level I</p>
          <ul style="padding-left:20px;margin:0 0 20px;">
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/cmt-level-1-complete-guide-2026" style="color:#2563eb;text-decoration:none;font-size:14px;">The Complete Beginner's Guide</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/candlestick-patterns-cmt-level-1" style="color:#2563eb;text-decoration:none;font-size:14px;">Candlestick Patterns</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/types-of-gaps-in-technical-analysis" style="color:#2563eb;text-decoration:none;font-size:14px;">Types of Gaps</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/point-and-figure-charting-complete-guide" style="color:#2563eb;text-decoration:none;font-size:14px;">Point &amp; Figure Charting</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/cmt-level-1-formulas-explained" style="color:#2563eb;text-decoration:none;font-size:14px;">Formula Cheat Sheet</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/cmt-level-1-practice-questions" style="color:#2563eb;text-decoration:none;font-size:14px;">100 Practice Questions</a></li>
          </ul>

          <!-- CMT Level II -->
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#064e3b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">CMT Level II</p>
          <ul style="padding-left:20px;margin:0 0 20px;">
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/complete-guide-to-cmt-level-2" style="color:#2563eb;text-decoration:none;font-size:14px;">Complete Study Guide</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/cmt-level-2-formulas-explained" style="color:#2563eb;text-decoration:none;font-size:14px;">Formula Cheat Sheet</a></li>
            <li style="margin:6px 0;"><a href="https://chartix.in/blog/cmt-level-2-practice-questions" style="color:#2563eb;text-decoration:none;font-size:14px;">100+ Practice Questions</a></li>
          </ul>

          <!-- Tools -->
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#064e3b;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">Tools</p>
          <ul style="padding-left:20px;margin:0 0 24px;">
            <li style="margin:6px 0;"><a href="https://chartix.in/tools" style="color:#2563eb;text-decoration:none;font-size:14px;">Understand Any Indicator — Interactive Tool</a></li>
          </ul>

          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">No sign-up. No paywall. Just quality study resources, ready when you are.</p>

          <div style="text-align:center;margin:0 0 24px;">
            <a href="https://chartix.in/" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">Explore All Free Resources →</a>
          </div>

          <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">Wishing you clarity in your charts and confidence in your preparation.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">Sumit Jain, CMT</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">Founder, Chartix.in</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, fullName: true },
    orderBy: { createdAt: 'asc' },
  });

  const targets = users.filter(u => u.email && !EXCLUDE.has(u.email.toLowerCase()));
  console.log(`Sending to ${targets.length} users (${users.length - targets.length} excluded)\n`);

  let sent = 0, failed = 0;

  for (const user of targets) {
    try {
      await resend.emails.send({
        from: FROM,
        to: user.email,
        cc: CC,
        subject: 'Your free CMT cheat sheet is inside',
        html: html(user.fullName),
      });
      console.log(`✓ ${user.email}`);
      sent++;
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(`✗ ${user.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
