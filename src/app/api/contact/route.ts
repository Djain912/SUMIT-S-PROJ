import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { resend, FROM_EMAIL, TO_EMAIL } from '@/lib/email/resend';
import { adminNotificationEmail, userAutoReplyEmail } from '@/lib/email/templates';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

// Rate limit: 3 submissions per hour per IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'contact',
});

const contactSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').max(200).trim().toLowerCase(),
  mobile: z.string().max(20).trim().optional().nullable(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200).trim(),
  queryType: z.enum(['GENERAL', 'COURSE_INFO', 'TECHNICAL_SUPPORT', 'BILLING', 'PARTNERSHIP', 'OTHER']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(3000).trim(),
  // Honeypot — bots fill this, humans don't
  website: z.string().max(0, 'Bot detected').optional(),
});

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';

    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many submissions. Please try again later.' } },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Honeypot check
    if (body.website) {
      // Silently succeed so bots think they submitted successfully
      return NextResponse.json({ success: true });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Invalid input';
      return NextResponse.json(
        { success: false, error: { message: firstError } },
        { status: 400 },
      );
    }

    const { fullName, email, mobile, subject, queryType, message } = parsed.data;

    // Save to database
    await prisma.contactSubmission.create({
      data: {
        id: crypto.randomUUID(),
        fullName,
        email,
        mobile: mobile ?? null,
        subject,
        queryType,
        message,
        status: 'NEW',
        ipAddress: ip,
      },
    });

    // Send emails (don't fail the request if email fails)
    const submittedAt = new Date();
    try {
      await Promise.all([
        // Notify admin
        resend.emails.send({
          from: FROM_EMAIL,
          to: TO_EMAIL,
          subject: `[Chartix Contact] ${subject}`,
          html: adminNotificationEmail({ fullName, email, mobile, subject, queryType, message, submittedAt }),
          replyTo: email,
        }),
        // Auto-reply to user
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `We received your message — Chartix`,
          html: userAutoReplyEmail({ fullName, subject }),
        }),
      ]);
    } catch (emailErr) {
      // Log but don't fail — the submission is already saved
      console.error('[contact/route] email send error:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[contact/route] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong. Please try again.' } },
      { status: 500 },
    );
  }
}
