import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { processPdf, listUploadedPdfs, deletePdf } from '@/lib/ai/pdf-processor';

export const dynamic = 'force-dynamic';
// Allow large PDF uploads (up to 50 MB)
export const maxDuration = 300;

// GET — list all uploaded PDFs
export async function GET() {
  try {
    await requireAdminUser();
    const pdfs = await listUploadedPdfs();
    return NextResponse.json({ success: true, data: pdfs });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Server error' } }, { status: 500 });
  }
}

// POST — upload and process a new PDF
export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const level = (formData.get('level') as string | null) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: { message: 'No file uploaded' } }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: { message: 'Only PDF files are supported' } }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: { message: 'File too large (max 50 MB)' } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processPdf({
      fileBuffer: buffer,
      fileName: file.name,
      level,
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        pageCount: result.pageCount,
        chunksCreated: result.chunksCreated,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    console.error('[admin/knowledge/pdf] error:', error);
    const msg = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}

// DELETE — remove a PDF's knowledge chunks
export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { fileName } = await request.json();
    if (!fileName) {
      return NextResponse.json({ success: false, error: { message: 'fileName required' } }, { status: 400 });
    }
    await deletePdf(fileName);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { message: 'Delete failed' } }, { status: 500 });
  }
}
