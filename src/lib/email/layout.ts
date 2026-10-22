// Shared layout for every Chartix email: ivory canvas, white card, green top
// rule, wordmark in its natural colours, serif headings and a gold accent.
// Table-based with inline styles only — Gmail/Outlook strip <style> and CSS
// filters, so nothing here may depend on them.

export const C = {
  green: '#0b3b2e',
  gold: '#c9a24b',
  goldText: '#a07d2e',
  ink: '#14251f',
  body: '#3d4a45',
  muted: '#8a938f',
  hair: '#ebe5d8',
  panel: '#f7f5ef',
  canvas: '#f4f1ea',
};

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = 'Arial,Helvetica,sans-serif';

export function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A body paragraph. Pass trusted HTML (escape user input first). */
export function p(html: string, opts: { size?: number; color?: string; mb?: number } = {}) {
  return `<p style="margin:0 0 ${opts.mb ?? 16}px;font-family:${SANS};font-size:${opts.size ?? 15}px;line-height:1.75;color:${opts.color ?? C.body};">${html}</p>`;
}

/** Small uppercase gold label. */
export function eyebrow(text: string) {
  return `<p style="margin:0 0 12px;font-family:${SANS};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${C.goldText};font-weight:700;">${text}</p>`;
}

/** Serif headline. */
export function heading(html: string, size = 28) {
  return `<h1 style="margin:0 0 22px;font-family:${SERIF};font-size:${size}px;line-height:1.25;font-weight:400;color:${C.ink};">${html}</h1>`;
}

/** Serif sub-heading inside the body. */
export function subheading(html: string) {
  return `<p style="margin:8px 0 14px;font-family:${SERIF};font-size:18px;line-height:1.35;color:${C.ink};">${html}</p>`;
}

/** Centred primary button with an optional small note underneath. */
export function button(href: string, label: string, note?: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 18px;"><tr><td style="text-align:center;">
    <a href="${esc(href)}" style="display:inline-block;background:${C.green};color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:.04em;padding:15px 38px;border-radius:3px;">${label}</a>
    ${note ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:12px;color:${C.muted};">${note}</p>` : ''}
  </td></tr></table>`;
}

/** Gold-diamond bullet list. Items are trusted HTML. */
export function list(items: string[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">${items
    .map(
      (it) => `<tr><td style="width:20px;padding:5px 0;vertical-align:top;font-size:13px;color:${C.gold};">&#9670;</td><td style="padding:5px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};">${it}</td></tr>`,
    )
    .join('')}</table>`;
}

/** Numbered rows separated by hairlines (e.g. steps or checks). */
export function steps(items: string[]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.hair};margin:0 0 20px;">${items
    .map(
      (it, i) => `<tr><td style="padding:14px 0;border-bottom:1px solid ${C.hair};font-family:${SANS};font-size:14.5px;line-height:1.6;color:${C.ink};"><span style="font-family:${SERIF};color:${C.goldText};font-size:16px;">${String(i + 1).padStart(2, '0')}&nbsp;&nbsp;</span>${it}</td></tr>`,
    )
    .join('')}</table>`;
}

/** Soft ivory panel for highlighted content. */
export function panel(innerHtml: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.panel};border-radius:4px;margin:6px 0 22px;"><tr><td style="padding:20px 24px;">${innerHtml}</td></tr></table>`;
}

/** Label/value rows (receipts, form submissions). Values are trusted HTML. */
export function details(rows: [string, string][]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.hair};margin:0 0 20px;">${rows
    .map(
      ([k, v]) => `<tr><td style="padding:11px 12px 11px 0;border-bottom:1px solid ${C.hair};width:34%;vertical-align:top;font-family:${SANS};font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.goldText};font-weight:700;">${k}</td><td style="padding:11px 0;border-bottom:1px solid ${C.hair};font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};">${v}</td></tr>`,
    )
    .join('')}</table>`;
}

/** Founder sign-off. */
export function signature(closing = 'Warm regards,') {
  return `<p style="margin:10px 0 18px;font-family:${SANS};font-size:15px;line-height:1.75;color:${C.body};">${closing}</p>
    <p style="margin:0;font-family:${SERIF};font-size:17px;color:${C.ink};">Sumit Jain, CMT</p>
    <p style="margin:2px 0 0;font-family:${SANS};font-size:12.5px;color:${C.muted};">Founder, Chartix</p>`;
}

/** Short team sign-off for transactional mail. */
export function teamSignature() {
  return `<p style="margin:10px 0 0;font-family:${SANS};font-size:15px;line-height:1.75;color:${C.body};">— The Chartix Team</p>`;
}

/** Hairline-separated note (P.S., small print). */
export function note(html: string) {
  return `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid ${C.hair};font-family:${SANS};font-size:13.5px;line-height:1.7;color:${C.body};">${html}</p>`;
}

export function emailLayout(opts: {
  /** <title> and screen-reader title. */
  title: string;
  /** Inbox preview text shown after the subject line. */
  preheader?: string;
  /** Main content (use the helpers above). */
  body: string;
  /** Small print in the footer. Defaults to a generic Chartix line. */
  footer?: string;
}) {
  const footer =
    opts.footer ??
    `Chartix · CMT exam preparation · <a href="https://chartix.in" style="color:${C.muted};">chartix.in</a><br>Questions? Write to <a href="mailto:contact@chartix.in" style="color:${C.muted};">contact@chartix.in</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas};font-family:${SANS};">
${opts.preheader ? `<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:36px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:6px;overflow:hidden;">
  <tr><td style="background:${C.green};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px 26px;text-align:center;">
    <img src="https://chartix.in/chartix-wordmark.png" alt="Chartix" width="132" style="display:inline-block;width:132px;height:auto;border:0;" />
    <p style="margin:12px 0 0;font-family:${SANS};font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${C.muted};">CMT Exam Preparation</p>
  </td></tr>
  <tr><td style="padding:0 44px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-top:1px solid #e6dcc4;font-size:0;line-height:0;">&nbsp;</td>
      <td width="36" style="width:36px;border-top:2px solid ${C.gold};font-size:0;line-height:0;">&nbsp;</td>
      <td style="border-top:1px solid #e6dcc4;font-size:0;line-height:0;">&nbsp;</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:34px 44px 34px;">
${opts.body}
  </td></tr>
  <tr><td style="background:${C.panel};padding:18px 44px;text-align:center;">
    <p style="margin:0;font-family:${SANS};font-size:11.5px;line-height:1.6;color:${C.muted};">${footer}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
