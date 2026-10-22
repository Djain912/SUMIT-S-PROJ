import { resend, FROM_EMAIL, BCC_EMAIL } from './resend';
import { emailLayout, eyebrow, heading, subheading, p, list, button, signature, note, esc, C } from './layout';

// The Resend SDK returns { error } instead of throwing, so a rejected send
// would otherwise pass silently. Throw so callers can log / retry.
async function sendOrThrow(params: Parameters<typeof resend.emails.send>[0]) {
  const { error } = await resend.emails.send(params);
  if (error) throw new Error(`Resend error (${error.name}): ${error.message}`);
}

function buildHtml({
  firstName,
  headline,
  subline,
  introLine,
  eyebrowText,
  cta = { href: 'https://chartix.in/user/notes', label: 'Start with Chapter 1 &rarr;' },
}: {
  firstName: string;
  headline: string;
  subline: string;
  introLine: string;
  eyebrowText: string;
  cta?: { href: string; label: string };
}) {
  const body = [
    eyebrow(eyebrowText),
    heading(headline),
    p(subline, { color: C.muted, size: 14 }),
    p(`Hi ${esc(firstName)},`),
    p(introLine),
    subheading('Where to begin'),
    list([
      '<strong>Study notes</strong> — structured, exam-focused notes for every topic.',
      '<strong>Practice questions</strong> — topic-wise, with full explanations. Aim for twenty a day.',
      '<strong>Mock exams</strong> — full-length and timed, in the real exam format.',
      '<strong>Readiness analytics</strong> — see exactly where you are strong, and where to improve.',
      '<strong>Chartix Scholar</strong> — an AI tutor for any concept, any time.',
    ]),
    button(cta.href, cta.label),
    signature('Wishing you focused, confident preparation.'),
    note('<strong style="color:#14251f;">P.S.</strong> We would love to hear how your preparation goes — share your thoughts at <a href="https://chartix.in/feedback" style="color:#0b3b2e;">chartix.in/feedback</a>.'),
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr><td style="text-align:center;">
      <img src="https://chartix.in/cmt-prep-provider-badge.png" width="48" height="48" alt="CMT Association Participating Prep Provider" style="display:block;margin:0 auto 8px;border:0;">
      <p style="margin:0;font-size:11.5px;line-height:1.5;color:#8a938f;">Chartix is a Participating Prep Provider of the CMT Association</p>
    </td></tr></table>`,
  ].join('\n');

  return emailLayout({
    title: headline.replace(/<br>/g, ' '),
    preheader: subline,
    body,
    footer: 'You received this because you signed up at <a href="https://chartix.in" style="color:#8a938f;">chartix.in</a><br><a href="https://chartix.in/blog" style="color:#8a938f;">Blog</a> &nbsp;·&nbsp; <a href="https://www.instagram.com/chartix.in" style="color:#8a938f;">Instagram</a> &nbsp;·&nbsp; <a href="mailto:contact@chartix.in" style="color:#8a938f;">contact@chartix.in</a>',
  });
}

function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

const LEVEL_DISPLAY_NAME: Record<string, string> = {
  LEVEL_1: 'CMT Level I',
  LEVEL_2: 'CMT Level II',
  LEVEL_3: 'CMT Level III',
};

export async function sendTrialWelcomeEmail(
  email: string,
  fullName: string | null | undefined,
  level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3',
) {
  const firstName = extractFirstName(fullName);
  const levelName = level ? LEVEL_DISPLAY_NAME[level] : null;
  await sendOrThrow({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: levelName ? `Your Chartix ${levelName} free trial is live` : 'Your Chartix free trial is live',
    html: buildHtml({
      firstName,
      eyebrowText: levelName ? `${levelName} · Free trial` : 'Free trial',
      headline: levelName ? `Your ${levelName} trial<br>is now live.` : 'Your free trial<br>is now live.',
      subline: levelName
        ? `Your 7-day ${levelName} trial starts now — notes, quizzes, mock tests and the AI tutor are ready to support your CMT preparation.`
        : 'Your 7-day access starts now — notes, quizzes, mock tests and the AI tutor are ready to support your CMT preparation.',
      introLine: levelName
        ? `Thank you for starting your ${levelName} free trial. All the notes, practice questions, and mock tests for ${levelName} are unlocked and ready for you.`
        : "Thank you for starting your free trial. We're excited to have you on board and look forward to helping you prepare with confidence.",
    }),
  });
}

export async function sendTrialNudgeEmail(email: string, fullName: string | null | undefined, daysRemaining: number) {
  const firstName = extractFirstName(fullName);
  await sendOrThrow({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: `You haven't started yet — ${daysRemaining} days left on your trial`,
    html: buildHtml({
      firstName,
      eyebrowText: `Free trial · ${daysRemaining} days left`,
      headline: 'Your trial is running.<br>Have you started?',
      subline: `You still have ${daysRemaining} days left — enough time to get a real feel for CMT preparation.`,
      introLine: `You signed up a couple of days ago but haven't opened any notes yet. No pressure — but your trial clock is running, and we don't want you to miss out.<br><br>Here's the quickest way to get started: open the first chapter, read for 10 minutes, then try a few practice questions. That's it.`,
    }),
  });
}

export async function sendTrialUrgencyEmail(email: string, fullName: string | null | undefined) {
  const firstName = extractFirstName(fullName);
  await sendOrThrow({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: '1 day left on your Chartix trial',
    html: buildHtml({
      firstName,
      eyebrowText: 'Free trial · Final day',
      headline: 'One day left<br>on your trial.',
      cta: { href: 'https://chartix.in/pricing', label: 'Continue my preparation &rarr;' },
      subline: 'Your 7-day free trial ends tomorrow. Here\'s how to make the most of it — or upgrade to keep going.',
      introLine: `Your free trial expires in about 24 hours. If you haven't had a chance to explore yet, today is the day.<br><br>If you've been using Chartix and want to continue, upgrading takes 2 minutes and keeps all your progress intact.`,
    }),
  });
}

export async function sendPremiumWelcomeEmail(email: string, fullName: string | null | undefined) {
  const firstName = extractFirstName(fullName);
  await sendOrThrow({
    from: FROM_EMAIL,
    to: email,
    bcc: [BCC_EMAIL],
    subject: 'Welcome to Chartix Premium',
    html: buildHtml({
      firstName,
      eyebrowText: 'Chartix Premium',
      headline: 'Welcome to<br>Chartix Premium.',
      subline: 'Your full access is now unlocked — notes, quizzes, mock tests and the AI tutor are ready to support your CMT preparation.',
      introLine: 'Thank you for choosing us to be part of your CMT journey. We\'re excited to have you on board and look forward to helping you prepare with confidence.',
    }),
  });
}
