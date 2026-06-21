import { writeFileSync } from 'fs';
import { generateInvoicePdf } from '../src/lib/invoices/generate';

async function main() {
  const pdf = await generateInvoicePdf({
    number: 'CHX-2026-0001',
    date: new Date(),
    razorpayPaymentId: 'pay_QxSampleDemo1234',
    name: 'Sumit Jain',
    phone: '+91 98765 43210',
    email: 'sumit@example.com',
    address: '501, Emerald Heights, Linking Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    gst: '27AAAAA0000A1Z5',
    description: 'CMT Level 1 — 6 months access',
    originalPaise: 699900,
    discountPaise: 70000,
    couponCode: 'LAUNCH20',
    finalPaise: 629900,
  });

  const out = `${process.env.HOME}/Desktop/CHX-2026-0001-sample.pdf`;
  writeFileSync(out, pdf);
  console.log('Saved to:', out);
}

main().catch(console.error);
