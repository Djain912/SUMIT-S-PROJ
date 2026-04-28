import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { enforceRateLimit } from '@/server/policies/rate-limit';
import { createMediaAsset } from '@/server/services/media.service';

const bodySchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  kind: z.enum(['IMAGE', 'PDF']),
  mimeType: z.string().min(1),
  originalName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request origin' } },
        { status: 403 },
      );
    }

    const user = await requireAdminUser();
    const decision = await enforceRateLimit({
      request,
      key: 'admin:uploads:record:post',
      maxRequests: 120,
      windowMs: 60_000,
      identifier: user.id,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many media record requests' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(decision.retryAfterSeconds),
          },
        },
      );
    }

    const payload = await request.json();
    const input = bodySchema.parse(payload);
    const asset = await createMediaAsset({
      ...input,
      uploadedById: user.id,
    });

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to save media record' } }, { status: 500 });
  }
}
