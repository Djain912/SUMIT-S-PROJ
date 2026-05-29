import { createRequire } from 'node:module';
import { createEmbedding, storeChunk, deleteChunksBySourceId } from './knowledge-store';

// Load pdf-parse as a CommonJS module (required for ESM projects)
const _require = createRequire(import.meta.url);
type PdfParseResult = { text: string; numpages: number };
type PdfParseFunc = (buffer: Buffer) => Promise<PdfParseResult>;
const pdfParse = _require('pdf-parse') as PdfParseFunc;

const CHUNK_SIZE = 500;   // words per chunk
const CHUNK_OVERLAP = 60; // words of overlap between chunks

function chunkText(text: string): string[] {
  // Clean up the text first
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.trim().length > 80) {
      chunks.push(chunk);
    }
    if (end >= words.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function processPdf(params: {
  fileBuffer: Buffer;
  fileName: string;
  level?: string | null;
}): Promise<{ chunksCreated: number; pageCount: number }> {
  const pdfData = await pdfParse(params.fileBuffer);

  const rawText = pdfData.text;
  const pageCount = pdfData.numpages;

  if (!rawText || rawText.trim().length < 100) {
    throw new Error('Could not extract text from this PDF. It may be a scanned image PDF.');
  }

  // Remove old chunks for this PDF before re-processing
  await deleteChunksBySourceId(params.fileName);

  const chunks = chunkText(rawText);
  let stored = 0;

  for (const chunk of chunks) {
    const prefixed = `[Source: ${params.fileName}]\n${chunk}`;
    const embedding = await createEmbedding(prefixed);
    await storeChunk({
      content: prefixed,
      embedding,
      level: params.level ?? null,
      sourceType: 'pdf',
      sourceId: params.fileName,
      chapterTitle: params.fileName.replace(/\.pdf$/i, ''),
    });
    stored++;
  }

  return { chunksCreated: stored, pageCount };
}

export async function listUploadedPdfs(): Promise<
  Array<{ name: string; chunkCount: number; uploadedAt: string }>
> {
  const { prisma } = await import('@/lib/db/prisma');

  const rows = await prisma.$queryRawUnsafe<
    Array<{ source_id: string; chunk_count: string; uploaded_at: string }>
  >(
    `SELECT source_id, COUNT(*)::text AS chunk_count, MIN(created_at)::text AS uploaded_at
     FROM knowledge_chunks
     WHERE source_type = 'pdf'
     GROUP BY source_id
     ORDER BY MIN(created_at) DESC`,
  );

  return rows.map((r) => ({
    name: r.source_id,
    chunkCount: parseInt(r.chunk_count, 10),
    uploadedAt: r.uploaded_at,
  }));
}

export async function deletePdf(fileName: string): Promise<void> {
  await deleteChunksBySourceId(fileName);
}
