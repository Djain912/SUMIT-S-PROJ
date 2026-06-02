import { openai, EMBEDDING_MODEL } from './openai';
import { prisma } from '@/lib/db/prisma';

export type KnowledgeChunkResult = {
  id: string;
  content: string;
  level: string | null;
  source_type: string;
  chapter_title: string | null;
  subtopic_title: string | null;
  similarity: number;
};

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export async function storeChunk(chunk: {
  content: string;
  embedding: number[];
  level?: string | null;
  sourceType: 'note' | 'pdf' | 'public_bot';
  sourceId?: string;
  chapterTitle?: string;
  subtopicTitle?: string;
}) {
  const embeddingLiteral = `[${chunk.embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO knowledge_chunks (content, embedding, level, source_type, source_id, chapter_title, subtopic_title)
     VALUES ($1, $2::vector, $3, $4, $5, $6, $7)`,
    chunk.content,
    embeddingLiteral,
    chunk.level ?? null,
    chunk.sourceType,
    chunk.sourceId ?? null,
    chunk.chapterTitle ?? null,
    chunk.subtopicTitle ?? null,
  );
}

export async function deleteChunksBySourceId(sourceId: string) {
  await prisma.$executeRawUnsafe(
    `DELETE FROM knowledge_chunks WHERE source_id = $1`,
    sourceId,
  );
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  level?: string | null,
  limit = 6,
): Promise<KnowledgeChunkResult[]> {
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

  if (level) {
    return prisma.$queryRawUnsafe<KnowledgeChunkResult[]>(
      `SELECT id::text, content, level, source_type, chapter_title, subtopic_title,
              (1 - (embedding <=> $1::vector))::float AS similarity
       FROM knowledge_chunks
       WHERE (level = $2 OR level IS NULL)
         AND (1 - (embedding <=> $1::vector)) > 0.45
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      embeddingLiteral,
      level,
      limit,
    );
  }

  return prisma.$queryRawUnsafe<KnowledgeChunkResult[]>(
    `SELECT id::text, content, level, source_type, chapter_title, subtopic_title,
            (1 - (embedding <=> $1::vector))::float AS similarity
     FROM knowledge_chunks
     WHERE (1 - (embedding <=> $1::vector)) > 0.45
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    embeddingLiteral,
    limit,
  );
}

// Search ONLY chunks from PDFs uploaded to the homepage bot
export async function searchPublicBotChunks(
  queryEmbedding: number[],
  limit = 8,
): Promise<KnowledgeChunkResult[]> {
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`;
  return prisma.$queryRawUnsafe<KnowledgeChunkResult[]>(
    `SELECT id::text, content, level, source_type, chapter_title, subtopic_title,
            (1 - (embedding <=> $1::vector))::float AS similarity
     FROM knowledge_chunks
     WHERE source_type = 'public_bot'
       AND (1 - (embedding <=> $1::vector)) > 0.35
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    embeddingLiteral,
    limit,
  );
}

export async function countChunks(): Promise<number> {
  const result = await prisma.$queryRawUnsafe<[{ count: string }]>(
    `SELECT COUNT(*)::text AS count FROM knowledge_chunks`,
  );
  return parseInt(result[0].count, 10);
}
