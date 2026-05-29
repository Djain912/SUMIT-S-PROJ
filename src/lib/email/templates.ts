// ── Email HTML templates ──────────────────────────────────────────────────────

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Contact Form Submission</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
  .header { background: #09090b; padding: 24px 32px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .header p { margin: 4px 0 0; color: #a1a1aa; font-size: 13px; }
  .body { padding: 28px 32px; }
  .badge { display: inline-block; background: #fef9c3; color: #854d0e; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin-bottom: 4px; }
  .field p { margin: 0; font-size: 14px; color: #18181b; }
  .message-box { background: #f4f4f5; border-radius: 8px; padding: 14px 16px; margin-top: 4px; }
  .message-box p { margin: 0; font-size: 14px; color: #18181b; line-height: 1.6; white-space: pre-wrap; }
  .divider { height: 1px; background: #e4e4e7; margin: 20px 0; }
  .footer { padding: 16px 32px; background: #f4f4f5; }
  .footer p { margin: 0; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Chartix — New Contact Submission</h1>
      <p>Someone filled out the contact form on chartix.in</p>
    </div>
    <div class="body">
      <div class="badge">${queryLabel}</div>

      <div class="field">
        <label>Full Name</label>
        <p>${escapeHtml(data.fullName)}</p>
      </div>
      <div class="field">
        <label>Email</label>
        <p><a href="mailto:${escapeHtml(data.email)}" style="color:#2563eb;">${escapeHtml(data.email)}</a></p>
      </div>
      ${data.mobile ? `
      <div class="field">
        <label>Mobile</label>
        <p>${escapeHtml(data.mobile)}</p>
      </div>` : ''}
      <div class="field">
        <label>Subject</label>
        <p>${escapeHtml(data.subject)}</p>
      </div>
      <div class="divider"></div>
      <div class="field">
        <label>Message</label>
        <div class="message-box"><p>${escapeHtml(data.message)}</p></div>
      </div>
    </div>
    <div class="footer">
      <p>Submitted on ${dateStr} IST &nbsp;·&nbsp; Chartix Contact Form</p>
    </div>
  </div>
</body>
</html>`;
}

/** Auto-reply email sent to the person who submitted the form */
export function userAutoReplyEmail(data: Pick<ContactEmailData, 'fullName' | 'subject'>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>We received your message</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
  .header { background: #09090b; padding: 24px 32px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; }
  .body { padding: 28px 32px; }
  .body p { margin: 0 0 14px; font-size: 14px; color: #3f3f46; line-height: 1.7; }
  .subject-box { background: #f4f4f5; border-left: 3px solid #09090b; border-radius: 4px; padding: 10px 14px; margin: 16px 0; font-size: 14px; color: #18181b; }
  .footer { padding: 16px 32px; background: #f4f4f5; border-top: 1px solid #e4e4e7; }
  .footer p { margin: 0; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Thanks for reaching out, ${escapeHtml(data.fullName.split(' ')[0])}!</h1>
    </div>
    <div class="body">
      <p>We've received your message and will get back to you within <strong>1–2 business days</strong>.</p>
      <p>Your enquiry was about:</p>
      <div class="subject-box">${escapeHtml(data.subject)}</div>
      <p>In the meantime, feel free to explore the study notes, quizzes, and analytics on <a href="https://chartix.in" style="color:#2563eb;">chartix.in</a>.</p>
      <p style="margin-bottom:0;">— The Chartix Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email — contact us at <a href="mailto:contact@chartix.in" style="color:#2563eb;">contact@chartix.in</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
