import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type InvoiceData = {
  number: string;           // CHX-2026-0001
  date: Date;
  razorpayPaymentId: string;
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
  description: string;      // "CMT Level 1 — 6 months access"
  originalPaise: number;    // before discount
  discountPaise: number;    // 0 if none
  couponCode?: string | null;
  finalPaise: number;       // amount actually charged
};

const EMERALD = rgb(0.016, 0.471, 0.341); // #047857
const BLACK   = rgb(0, 0, 0);
const GREY    = rgb(0.45, 0.45, 0.45);
const LIGHT   = rgb(0.95, 0.97, 0.96);

function rupees(paise: number) {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const ml = 50; // margin left
  const mr = width - 50; // margin right

  let y = height - 48;

  // ── Header bar ──────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: EMERALD });

  page.drawText('CHARTIX', {
    x: ml, y: height - 42, size: 22, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText('chartix.in', {
    x: ml, y: height - 60, size: 9, font: reg, color: rgb(0.8, 0.95, 0.88),
  });
  page.drawText('INVOICE', {
    x: mr - 60, y: height - 44, size: 18, font: bold, color: rgb(1, 1, 1),
  });

  y = height - 100;

  // ── Invoice meta ─────────────────────────────────────────────────
  const dateStr = data.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  page.drawText(`Invoice No: ${data.number}`, { x: ml, y, size: 10, font: bold, color: BLACK });
  page.drawText(`Date: ${dateStr}`,           { x: mr - 160, y, size: 10, font: reg, color: GREY });
  y -= 14;
  page.drawText(`Payment ID: ${data.razorpayPaymentId}`, { x: ml, y, size: 8, font: reg, color: GREY });
  y -= 24;

  // divider
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  // ── Bill To ──────────────────────────────────────────────────────
  page.drawText('Bill To', { x: ml, y, size: 9, font: bold, color: EMERALD });
  y -= 16;
  page.drawText(data.name, { x: ml, y, size: 11, font: bold, color: BLACK });
  y -= 14;

  if (data.phone) { page.drawText(data.phone, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 13; }
  if (data.email) { page.drawText(data.email, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 13; }

  const addrParts = [data.address, [data.city, data.state].filter(Boolean).join(', '), data.pincode].filter(Boolean);
  for (const part of addrParts) {
    page.drawText(part!, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 13;
  }
  if (data.gst) {
    page.drawText(`GSTIN: ${data.gst}`, { x: ml, y, size: 9, font: reg, color: GREY }); y -= 13;
  }
  y -= 14;

  // divider
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 20;

  // ── Items table header ───────────────────────────────────────────
  page.drawRectangle({ x: ml, y: y - 4, width: mr - ml, height: 22, color: LIGHT });
  page.drawText('Description',  { x: ml + 8, y: y + 4, size: 9, font: bold, color: GREY });
  page.drawText('Amount',       { x: mr - 70, y: y + 4, size: 9, font: bold, color: GREY });
  y -= 26;

  // Line item
  page.drawText(data.description, { x: ml + 8, y, size: 10, font: reg, color: BLACK });
  page.drawText(rupees(data.originalPaise), { x: mr - 80, y, size: 10, font: reg, color: BLACK });
  y -= 18;

  // Discount row
  if (data.discountPaise > 0) {
    const label = data.couponCode ? `Discount (${data.couponCode})` : 'Discount';
    page.drawText(label, { x: ml + 8, y, size: 10, font: reg, color: rgb(0.2, 0.6, 0.4) });
    page.drawText(`-${rupees(data.discountPaise)}`, { x: mr - 80, y, size: 10, font: reg, color: rgb(0.2, 0.6, 0.4) });
    y -= 18;
  }

  y -= 6;
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 18;

  // Total
  page.drawText('Total Paid', { x: ml + 8, y, size: 11, font: bold, color: BLACK });
  page.drawText(rupees(data.finalPaise), { x: mr - 80, y, size: 11, font: bold, color: EMERALD });
  y -= 10;

  // GST note
  page.drawText('*Educational services — GST exemption may apply as per applicable law.',
    { x: ml + 8, y, size: 7, font: reg, color: GREY });
  y -= 40;

  // ── Footer ───────────────────────────────────────────────────────
  page.drawLine({ start: { x: ml, y }, end: { x: mr, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  y -= 16;
  page.drawText('Thank you for choosing Chartix for your CMT preparation!',
    { x: ml, y, size: 9, font: bold, color: EMERALD });
  y -= 13;
  page.drawText('For any queries: support@chartix.in  |  chartix.in',
    { x: ml, y, size: 8, font: reg, color: GREY });

  return doc.save();
}
