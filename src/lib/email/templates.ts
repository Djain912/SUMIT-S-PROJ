// ── Email HTML templates ──────────────────────────────────────────────────────

import { emailLayout, eyebrow, heading, p, button, panel, details, teamSignature, esc, C } from './layout';

const QUERY_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General Enquiry',
  COURSE_INFO: 'Course Information',
  TECHNICAL_SUPPORT: 'Technical Support',
  BILLING: 'Billing / Payment',
  PARTNERSHIP: 'Partnership',
  OTHER: 'Other',
};

interface ContactEmailData {
  fullName: string;
  email: string;
  mobile?: string | null;
  subject: string;
  queryType: string;
  message: string;
  submittedAt: Date;
}

/** Email sent to the admin (contact@chartix.in) when someone submits the form */
export function adminNotificationEmail(data: ContactEmailData): string {
  const queryLabel = QUERY_TYPE_LABELS[data.queryType] ?? data.queryType;
  const dateStr = data.submittedAt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const rows: [string, string][] = [
    ['Name', esc(data.fullName)],
    ['Email', `<a href="mailto:${esc(data.email)}" style="color:${C.green};">${esc(data.email)}</a>`],
  ];
  if (data.mobile) rows.push(['Mobile', esc(data.mobile)]);
  rows.push(['Type', esc(queryLabel)], ['Subject', esc(data.subject)]);

  return emailLayout({
    title: 'New contact form submission',
    preheader: `${data.fullName}: ${data.subject}`,
    body: [
      eyebrow('Contact form · New submission'),
      heading(esc(data.subject), 24),
      details(rows),
      panel(`<p style="margin:0;font-size:14px;line-height:1.7;color:${C.ink};white-space:pre-wrap;">${esc(data.message)}</p>`),
    ].join('\n'),
    footer: `Submitted ${dateStr} IST · Chartix contact form`,
  });
}

/** Auto-reply email sent to the person who submitted the form */
export function userAutoReplyEmail(data: Pick<ContactEmailData, 'fullName' | 'subject'>): string {
  const firstName = data.fullName.trim().split(/\s+/)[0] || 'there';
  return emailLayout({
    title: 'We received your message',
    preheader: 'Thank you for writing to Chartix — we will reply within 1–2 business days.',
    body: [
      eyebrow('Message received'),
      heading(`Thank you for<br>reaching out, ${esc(firstName)}.`),
      p('We have received your message and will reply within <strong>1–2 business days</strong>.'),
      p('Your enquiry was about:', { mb: 10 }),
      panel(`<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:${C.ink};">${esc(data.subject)}</p>`),
      p(`In the meantime, your notes, practice questions and analytics are always available on <a href="https://chartix.in" style="color:${C.green};">chartix.in</a>.`),
      teamSignature(),
    ].join('\n'),
    footer: 'This is an automated confirmation. For anything else, write to <a href="mailto:contact@chartix.in" style="color:#8a938f;">contact@chartix.in</a>.',
  });
}

/** Email with a one-time password-reset link. */
export function passwordResetEmail(data: { resetUrl: string; firstName?: string | null }): string {
  const hi = data.firstName ? `Hi ${esc(data.firstName)},` : 'Hello,';
  return emailLayout({
    title: 'Reset your Chartix password',
    preheader: 'Use this link within one hour to choose a new password.',
    body: [
      eyebrow('Account security'),
      heading('Reset your password'),
      p(hi),
      p('We received a request to reset the password for your Chartix account. Use the button below to choose a new one. The link expires in <strong>one hour</strong> and can be used once.'),
      button(data.resetUrl, 'Reset password'),
      p(`Or paste this link into your browser:<br><span style="word-break:break-all;">${esc(data.resetUrl)}</span>`, { size: 12, color: C.muted }),
      p('If you did not request this, you can safely ignore this email — your password will not change.'),
      teamSignature(),
    ].join('\n'),
  });
}
