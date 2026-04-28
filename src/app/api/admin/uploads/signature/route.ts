import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { createUploadSignature } from '@/lib/cloudinary/server';

const bodySchema = z.object({
  resourceType: z.enum(['image', 'raw']).default('image'),
  folder: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid request origin' } },
      { status: 403 },
    );
  }

  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }

    return NextResponse.json({ success: false, error: { message: 'Unable to verify admin user' } }, { status: 500 });
  }

  let payload: Record<string, unknown> = {};
  
  const contentLength = request.headers.get('content-length');
  if (!contentLength || contentLength === '0' || contentLength === '') {
    console.log('[signature] Empty body, using defaults');
    payload = { resourceType: 'image' };
  } else {
    try {
      payload = await request.json();
    } catch {
      payload = { resourceType: 'image' };
    }
  }
  
  try {
    const input = bodySchema.parse(payload);
    const signature = createUploadSignature(input.resourceType, input.folder);
    return NextResponse.json({ success: true, data: signature });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}