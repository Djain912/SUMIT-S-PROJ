import { prisma } from '@/lib/db/prisma';
import { generateInvoicePdf } from './generate';
import { resend, FROM_EMAIL, BCC_EMAIL } from '@/lib/email/resend';
import { emailLayout, eyebrow, heading, p, details, button, signature, esc, C } from '@/lib/email/layout';

function pad(n: number) {
  return String(n).padStart(4, '0');
}

export async function issueInvoice(paymentId: string): Promise<void> {
  // Idempotent — skip if already issued
  const existing = await prisma.invoice.findUnique({ where: { paymentId } });
  if (existing) return;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'PAID') return;

  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { email: true },
  });

  // Allocate invoice number from Postgres sequence
  const seq = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval('invoice_number_seq')`;
  const n = Number(seq[0].nextval);
  const year = new Date().getFullYear();
  const invoiceNumber = `CHX-${year}-${pad(n)}`;

  const discountPaise = payment.discountPaise ?? 0;
  // Reconstruct original (pre-discount) price from what was actually charged.
  const originalUnits = payment.amount + discountPaise;

  const levelDescriptions: Record<string, string> = {
    LEVEL_1: 'Chartix CMT Level 1 Material — 6 months access',
    LEVEL_2: 'Chartix CMT Level 2 Material — 6 months access',
    LEVEL_3: 'Chartix CMT Level 3 Material — 6 months access',
  };
  const levelLabels: Record<string, string> = {
    LEVEL_1: 'CMT Level 1',
    LEVEL_2: 'CMT Level 2',
    LEVEL_3: 'CMT Level 3',
  };
  const level = payment.level ?? 'LEVEL_1';
  const description = levelDescriptions[level] ?? 'Chartix CMT Material — 6 months access';
  const levelLabel = levelLabels[level] ?? 'CMT Level 1';

  const pdfBytes = await generateInvoicePdf({
    number: invoiceNumber,
    date: payment.createdAt,
    razorpayPaymentId: payment.razorpayPaymentId ?? '',
    currency: payment.currency ?? 'INR',
    level,
    name: payment.billingName ?? 'Customer',
    phone: payment.billingPhone,
    email: payment.billingEmail ?? user?.email,
    address: payment.billingAddress,
    city: payment.billingCity,
    state: payment.billingState,
    pincode: payment.billingPincode,
    gst: payment.billingGst,
    description,
    originalPaise: originalUnits,
    discountPaise,
    couponCode: payment.couponCode,
    finalPaise: payment.amount,
  });

  const invoice = await prisma.invoice.create({
    data: {
      id: crypto.randomUUID(),
      number: invoiceNumber,
      paymentId,
    },
  });

  const toEmail = payment.billingEmail ?? user?.email;
  if (toEmail) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        bcc: [BCC_EMAIL],
        subject: `Your Chartix invoice ${invoiceNumber}`,
        html: emailLayout({
          title: `Your Chartix invoice ${invoiceNumber}`,
          preheader: `Payment received — your ${levelLabel} access is active for 6 months.`,
          body: [
            eyebrow(`${levelLabel} · Payment received`),
            heading('Thank you for<br>your purchase.'),
            p(`Hi ${esc((payment.billingName ?? '').trim().split(/\s+/)[0] || 'there')},`),
            p(`Your payment is confirmed. You now have <strong>six months of full access</strong> to <strong>Chartix ${levelLabel}</strong> — every note, practice question, mock exam and Chartix Scholar.`),
            details([
              ['Invoice', invoiceNumber],
              ['Plan', esc(description)],
              ['Amount paid', `&#8377;${(payment.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ]),
            p('Your invoice is attached to this email as a PDF.', { size: 14, color: C.muted }),
            button('https://chartix.in/user', 'Go to my dashboard &rarr;'),
            signature('Happy studying,'),
          ].join('\n'),
          footer: 'Questions about your invoice? Reply to this email or write to <a href="mailto:contact@chartix.in" style="color:#8a938f;">contact@chartix.in</a>.',
        }),
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: Buffer.from(pdfBytes).toString('base64'),
          },
        ],
      });
      await prisma.invoice.update({ where: { id: invoice.id }, data: { emailSent: true } });
    } catch (err) {
      console.error('[invoice] email failed:', err);
    }
  }
}
