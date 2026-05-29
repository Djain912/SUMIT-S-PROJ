import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? 'Chartix <contact@chartix.in>';
export const TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'contact@chartix.in';
