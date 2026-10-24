// Time-boxed festive offers. The Coupon table has no expiry column, so the
// deadline lives here and is enforced by coupon-validate and the order route.

export type FestiveOffer = {
  code: string;
  percent: number;
  endsAt: Date;
  endsLabel: string;
};

export const DIWALI_OFFER: FestiveOffer = {
  code: 'DIYA30',
  percent: 30,
  endsAt: new Date('2026-11-15T23:59:59+05:30'),
  endsLabel: '15 November',
};

export function isOfferLive(offer: FestiveOffer = DIWALI_OFFER, now = new Date()): boolean {
  return now <= offer.endsAt;
}

// True when `code` belongs to an offer whose deadline has passed.
export function isExpiredOfferCode(code: string, now = new Date()): boolean {
  return code.toUpperCase() === DIWALI_OFFER.code && !isOfferLive(DIWALI_OFFER, now);
}
