import { headers } from 'next/headers';

export type SupportedCurrency = 'INR' | 'USD';

export async function getVisitorCurrency(): Promise<SupportedCurrency> {
  const h = await headers();
  const country = h.get('x-vercel-ip-country') ?? 'IN';
  return country === 'IN' ? 'INR' : 'USD';
}
