import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { readFileSync } from 'fs';
import path from 'path';

export type InvoiceData = {
  number: string;
  date: Date;
  razorpayPaymentId: string;
  currency?: string;
  level?: string;         // LEVEL_1 | LEVEL_2 | LEVEL_3
  // Buyer
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gst?: string | null;
  // Line item
  description: string;
  originalPaise: number;
  discountPaise: number;
  couponCode?: string | null;
  finalPaise: number;
};

const EMERALD     = rgb(0.016, 0.471, 0.341);  // #047857
const EMERALD_DRK = rgb(0.012, 0.329, 0.239);  // #085438
const BLACK       = rgb(0, 0, 0);
const GREY        = rgb(0.45, 0.45, 0.45);
const LGREY       = rgb(0.75, 0.75, 0.75);
const LIGHT       = rgb(0.95, 0.97, 0.96);
const WHITE       = rgb(1, 1, 1);

const CURRENCY_META: Record<string, { symbol: string; locale: string }> = {
  INR: { symbol: 'Rs. ', locale: 'en-IN' },
  USD: { symbol: '$',    locale: 'en-US' },
  EUR: { symbol: 'EUR ', locale: 'de-DE' },
  GBP: { symbol: 'GBP ', locale: 'en-GB' },
  AED: { symbol: 'AED ', locale: 'en-AE' },
  SGD: { symbol: 'SGD ', locale: 'en-SG' },
};

function fmtAmount(units: number, currency = 'INR') {
  const { symbol, locale } = CURRENCY_META[currency] ?? { symbol: `${currency} `, locale: 'en-US' };
  return symbol + (units / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
}

function levelLabel(level?: string): string {
  if (level === 'LEVEL_2') return 'CMT Level 2';
  if (level === 'LEVEL_3') return 'CMT Level 3';
  return 'CMT Level 1';
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const currency = data.currency ?? 'INR';
  const doc  = await PDFDocument.create();
  const page = doc.addPage([595, 842]);

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg    = await doc.embedFont(StandardFonts.Helvetica);
  const obliq  = await doc.embedFont(StandardFonts.HelveticaOblique);

  const { width, height } = page.getSize();
  const ml = 50;
  const mr = width - 50;
  const cw = mr - ml;  // content width = 495

  // ── Load & embed logo + icon ─────────────────────────────────────
  const logoPath = path.join(process.cwd(), 'public', 'chartix-logo.png');
  const iconPath = path.join(process.cwd(), 'public', 'chartix-icon.png');
  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  let iconImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try { logoImage = await doc.embedPng(readFileSync(logoPath)); } catch { /* fallback to text */ }
  try { iconImage = await doc.embedPng(readFileSync(iconPath)); } catch { /* no icon */ }

  // ── WATERMARK — centred icon + "CMT EXAM PREP PLATFORM" ─────────
  // Matches the Index Builder chart download watermark exactly.
  const wmOpacity = 0.10;
  const wmColor   = rgb(0.016, 0.471, 0.341);

  // 1. Large centred icon
  if (iconImage) {
    const iconSz = 170;
    page.drawImage(iconImage, {
      x: (width - iconSz) / 2,
      y: height / 2 - iconSz / 2 + 18,
      width:   iconSz,
      height:  iconSz,
      opacity: wmOpacity,
    });
  }

  // 2. "CMT EXAM PREP PLATFORM" — manually letter-spaced below icon
  const wmLabel    = 'CMT EXAM PREP PLATFORM';
  const wmFontSize = 12;
  const letterGap  = 2.8;                        // extra px between each char
  let totalW = 0;
  for (const ch of wmLabel) {
    totalW += bold.widthOfTextAtSize(ch, wmFontSize) + letterGap;
  }
  totalW -= letterGap;
  let cx = (width - totalW) / 2;
  const labelY = height / 2 - 100;
  for (const ch of wmLabel) {
    const cw = bold.widthOfTextAtSize(ch, wmFontSize);
    page.drawText(ch, {
      x: cx, y: labelY,
      size: wmFontSize, font: bold,
      color: wmColor, opacity: wmOpacity,
    });
    cx += cw + letterGap;
  }

  // ── HEADER ───────────────────────────────────────────────────────
  // White header 90px tall with 3px emerald accent line at bottom
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: WHITE });
  page.drawRectangle({ x: 0, y: height - 93, width, height: 3,  color: EMERALD });

  if (logoImage) {
    const logoH = 36;
    const logoW = logoH * (logoImage.width / logoImage.height);
    page.drawImage(logoImage, {
      x: ml,
      y: height - 52,   // top-aligned with padding
      width: logoW,
      height: logoH,
      opacity: 1,
    });
    // Tagline below logo
    page.drawText('CMT Exam Prep Platform', {
      x: ml, y: height - 68, size: 8, font: reg, color: GREY,
    });
  } else {
    page.drawText('CHARTIX', { x: ml, y: height - 48, size: 20, font: bold, color: EMERALD });
    page.drawText('CMT Exam Prep Platform', { x: ml, y: height - 64, size: 8, font: reg, color: GREY });
  }

  // "INVOICE" pill on the right, vertically centred in header
  page.drawRectangle({ x: mr - 90, y: height - 68, width: 90, height: 28, color: EMERALD });
  page.drawText('INVOICE', { x: mr - 78, y: height - 57, size: 11, font: bold, color: WHITE });

  let y = height - 110;

  // ── INVOICE META ─────────────────────────────────────────────────
  const dateStr = data.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Left column
  page.drawText('Invoice No.', { x: ml, y, size: 8, font: bold, color: GREY });
  page.drawText(`Date`, { x: ml + 200, y, size: 8, font: bold, color: GREY });
  y -= 13;
  page.drawText(data.number, { x: ml, y, size: 11, font: bold, color: BLACK });
  page.drawText(dateStr,     { x: ml + 200, y, size: 10, font: reg, color: BLACK });
  y -= 12;
  page.drawText('Payment ID', { x: ml, y, size: 8, font: bold, color: GREY });
  y -= 12;
  page.drawText(data.razorpayPaymentId, { x: ml, y, size: 9, font: reg, color: GREY });
  y -= 22;

  // Divider
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: LGREY });
  y -= 18;

  // ── BILL TO / SOLD BY columns ─────────────────────────────────────
  const col2 = ml + 280;

  page.drawText('BILL TO', { x: ml, y, size: 8, font: bold, color: EMERALD });
  page.drawText('SOLD BY', { x: col2, y, size: 8, font: bold, color: EMERALD });
  y -= 15;

  page.drawText(data.name, { x: ml, y, size: 11, font: bold, color: BLACK });
  page.drawText('Chartix', { x: col2, y, size: 10, font: bold, color: BLACK });
  y -= 13;

  if (data.phone) { page.drawText(data.phone, { x: ml, y, size: 9, font: reg, color: GREY }); }
  page.drawText('contact@chartix.in', { x: col2, y, size: 9, font: reg, color: GREY });
  y -= 12;

  if (data.email) { page.drawText(data.email, { x: ml, y, size: 9, font: reg, color: GREY }); }
  page.drawText('chartix.in', { x: col2, y, size: 9, font: reg, color: GREY });
  y -= 12;

  const addrParts = [
    data.address,
    [data.city, data.state].filter(Boolean).join(', '),
    data.pincode,
  ].filter(Boolean);
  for (const part of addrParts) {
    page.drawText(part!, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 12;
  }
  if (data.gst) {
    page.drawText(`GSTIN: ${data.gst}`, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 12;
  }

  y -= 10;

  // Divider
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: LGREY });
  y -= 18;

  // ── ITEMS TABLE ──────────────────────────────────────────────────
  // Header row
  page.drawRectangle({ x: ml, y: y - 6, width: cw, height: 24, color: EMERALD });
  page.drawText('DESCRIPTION',   { x: ml + 10, y: y + 3, size: 8, font: bold, color: WHITE });
  page.drawText('UNIT PRICE',    { x: mr - 200, y: y + 3, size: 8, font: bold, color: WHITE });
  page.drawText('QTY',           { x: mr - 110, y: y + 3, size: 8, font: bold, color: WHITE });
  page.drawText('AMOUNT',        { x: mr - 70,  y: y + 3, size: 8, font: bold, color: WHITE });
  y -= 28;

  // Line item row
  page.drawRectangle({ x: ml, y: y - 6, width: cw, height: 22, color: LIGHT });
  page.drawText(data.description, { x: ml + 10, y: y + 3, size: 9, font: reg, color: BLACK });
  page.drawText(fmtAmount(data.originalPaise, currency), { x: mr - 200, y: y + 3, size: 9, font: reg, color: BLACK });
  page.drawText('1',                                      { x: mr - 100, y: y + 3, size: 9, font: reg, color: BLACK });
  page.drawText(fmtAmount(data.originalPaise, currency),  { x: mr - 70,  y: y + 3, size: 9, font: reg, color: BLACK });
  y -= 30;

  // Full-width divider below table
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: LGREY });
  y -= 16;

  // Subtotal + Discount summary (right-aligned, only when discount applied)
  if (data.discountPaise > 0) {
    const discLabel = data.couponCode ? `Discount (${data.couponCode})` : 'Discount';
    page.drawText('Subtotal', { x: mr - 200, y, size: 9, font: reg, color: GREY });
    page.drawText(fmtAmount(data.originalPaise, currency), { x: mr - 70, y, size: 9, font: reg, color: GREY });
    y -= 18;
    page.drawText(discLabel, { x: mr - 200, y, size: 9, font: obliq, color: EMERALD });
    page.drawText(`- ${fmtAmount(data.discountPaise, currency)}`, { x: mr - 70, y, size: 9, font: bold, color: EMERALD });
    y -= 12;
    page.drawLine({ start: { x: mr - 220, y }, end: { x: mr, y }, thickness: 0.5, color: LGREY });
    y -= 16;
  }

  // TOTAL PAID — full-width highlighted block
  // Rect sits BELOW current y (y = top edge of block).
  const totalBoxH = 32;
  const totalStr = fmtAmount(data.finalPaise, currency);
  const totalStrW = bold.widthOfTextAtSize(totalStr, 13);
  page.drawRectangle({ x: ml, y: y - totalBoxH, width: cw, height: totalBoxH, color: LIGHT });
  const totalTextY = y - totalBoxH / 2 - 4;
  page.drawText('TOTAL PAID', { x: ml + 10, y: totalTextY, size: 9, font: bold, color: EMERALD_DRK });
  page.drawText(totalStr, { x: mr - totalStrW - 5, y: totalTextY, size: 13, font: bold, color: EMERALD });
  y -= totalBoxH + 8;

  // Tax note
  page.drawText('* Prices are inclusive of all applicable taxes.',
    { x: ml, y, size: 7, font: obliq, color: LGREY });
  y -= 36;

  // ── FOOTER ───────────────────────────────────────────────────────
  const footerY = 60;

  page.drawLine({ start: { x: ml, y: footerY + 36 }, end: { x: mr, y: footerY + 36 }, thickness: 0.5, color: LGREY });

  // Thank you — centred
  const tyText = `Thank you for choosing Chartix for your ${levelLabel(data.level)} preparation!`;
  const tyW = bold.widthOfTextAtSize(tyText, 9);
  page.drawText(tyText, {
    x: (width - tyW) / 2,
    y: footerY + 20,
    size: 9, font: bold, color: EMERALD,
  });

  // Contact — centred
  const ctText = 'contact@chartix.in  |  chartix.in';
  const ctW = reg.widthOfTextAtSize(ctText, 8);
  page.drawText(ctText, {
    x: (width - ctW) / 2,
    y: footerY + 6,
    size: 8, font: reg, color: GREY,
  });

  return doc.save();
}
