import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { createEmbedding, storeChunk, deleteChunksBySourceId } from '@/lib/ai/knowledge-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const _require = createRequire(import.meta.url);
type PdfParseFunc = (buffer: Buffer) => Promise<{ text: string }>;
const pdfParse = _require('pdf-parse') as PdfParseFunc;

const MAX_CHARS_PER_SOURCE = 60000;
const CHUNK_SIZE = 500; // words per chunk
const CHUNK_OVERLAP = 60;

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim().length > 80) chunks.push(chunk);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embedSource(sourceId: string, name: string, text: string) {
  // Remove old chunks first (re-upload scenario)
  await deleteChunksBySourceId(sourceId);
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    try {
      const embedding = await createEmbedding(`[${name}] ${chunk}`);
      await storeChunk({
        content: `[${name}] ${chunk}`,
        embedding,
        level: null,
        sourceType: 'public_bot',
        sourceId,
      });
    } catch { /* skip failed chunk */ }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// GET — list all sources (metadata only, no full content)
export async function GET() {
  try {
    await requireAdminUser();
    const sources = await prisma.publicBotSource.findMany({
      select: { id: true, type: true, name: true, charCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalChars = sources.reduce((sum, s) => sum + s.charCount, 0);
    return NextResponse.json({ success: true, data: { sources, totalChars } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to load sources' } }, { status: 500 });
  }
}

// POST — add a PDF (FormData) or URL (JSON)
export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const contentType = request.headers.get('content-type') ?? '';

    // ── URL mode ──────────────────────────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const url = (body.url as string | undefined)?.trim();
      if (!url) {
        return NextResponse.json({ success: false, error: { message: 'URL is required' } }, { status: 400 });
      }

      let html: string;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Chartix/1.0; +https://chartix.in)' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      } catch (e) {
        return NextResponse.json(
          { success: false, error: { message: `Could not fetch URL: ${(e as Error).message}` } },
          { status: 400 },
        );
      }

      const text = stripHtml(html).slice(0, MAX_CHARS_PER_SOURCE);
      if (text.length < 100) {
        return NextResponse.json(
          { success: false, error: { message: 'Could not extract enough text from that URL' } },
          { status: 400 },
        );
      }

      const source = await prisma.publicBotSource.create({
        data: { type: 'url', name: url, content: text, charCount: text.length },
      });

      // Embed in background so response is instant
      embedSource(source.id, url, text).catch((e) => console.error('[public-bot embed url]', e));

      return NextResponse.json({ success: true, data: { id: source.id, name: url, charCount: text.length } });
    }

    // ── PDF mode ──────────────────────────────────────────────────────────
    const formData = await request.formData();
    const files: File[] = [];

    const single = formData.get('pdf') as File | null;
    if (single && single.size > 0) files.push(single);
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`pdf_${i}`) as File | null;
      if (f && f.size > 0) files.push(f);
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: { message: 'No PDF files provided' } }, { status: 400 });
    }

    const results: { name: string; charCount: number }[] = [];
    for (const f of files) {
      const buffer = Buffer.from(await f.arrayBuffer());
      const pdf = await pdfParse(buffer);
      const text = pdf.text.slice(0, MAX_CHARS_PER_SOURCE);
      if (!text.trim()) continue;

      const saved = await prisma.publicBotSource.create({
        data: { type: 'pdf', name: f.name, content: text, charCount: text.length },
      });

      // Embed in background
      embedSource(saved.id, f.name, text).catch((e) => console.error('[public-bot embed pdf]', e));

      results.push({ name: f.name, charCount: text.length });
    }

    return NextResponse.json({ success: true, data: { added: results.length, results } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    }
    console.error('[public-bot-sources] POST error:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to add source' } }, { status: 500 });
  }
}

// DELETE — remove a single source by id
export async function DELETE(request: Request) {
  try {
    await requireAdminUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: { message: 'id is required' } }, { status: 400 });
    }
    await prisma.publicBotSource.delete({ where: { id } });
    // Remove from vector store too
    deleteChunksBySourceId(id).catch((e) => console.error('[public-bot delete chunks]', e));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: 'Failed to delete source' } }, { status: 500 });
  }
}
