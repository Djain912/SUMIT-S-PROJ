import { writeFileSync } from 'fs';
import { generateInvoicePdf } from '../src/lib/invoices/generate';

async function main() {
  const pdf = await generateInvoicePdf({
    number: 'CHX-2026-0002',
    date: new Date(),
    razorpayPaymentId: 'pay_QxIntlDemo5678',
    currency: 'USD',
    level: 'LEVEL_1',
    name: 'John Carter',
    phone: '+1 415 555 0142',
    email: 'john.carter@example.com',
    address: '218 Market Street, Apt 9B',
    city: 'San Francisco',
    state: 'California',
    pincode: '94105',
    gst: null,
    description: 'Chartix CMT Level 1 Material — 6 months access',
    originalPaise: 9900,   // $99.00 (cents)
    discountPaise: 4950,   // 50% off
    couponCode: 'GLOBAL50',
    finalPaise: 4950,      // $49.50
  });

  const out = `${process.env.HOME}/Desktop/CHX-2026-0002-usd-sample.pdf`;
  writeFileSync(out, pdf);
  console.log('Saved to:', out);
}

main().catch(console.error);
