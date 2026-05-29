import { createEmbedding, searchSimilarChunks, storeChunk, deleteChunksBySourceId } from './knowledge-store';

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text: string): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const word of words) {
    current.push(word);
    wordCount++;

    if (wordCount >= CHUNK_SIZE) {
      chunks.push(current.join(' '));
      // Keep last CHUNK_OVERLAP words for context continuity
      current = current.slice(-CHUNK_OVERLAP);
      wordCount = current.length;
    }
  }

  if (current.length > 20) {
    chunks.push(current.join(' '));
  }

  return chunks;
}

export async function embedNote(note: {
  id: string;
  title: string;
  contentHtml: string | null;
  level?: string | null;
  chapterTitle?: string;
  subtopicTitle?: string;
}) {
  // Remove old chunks for this note before re-embedding
  await deleteChunksBySourceId(note.id);

  const plainText = note.contentHtml ? stripHtml(note.contentHtml) : '';
  if (!plainText || plainText.length < 50) return 0;

  const headerContext = `[${note.chapterTitle ?? ''}${note.subtopicTitle ? ' > ' + note.subtopicTitle : ''}] ${note.title}: `;
  const chunks = chunkText(plainText);
  let stored = 0;

  for (const chunk of chunks) {
    const textToEmbed = headerContext + chunk;
    const embedding = await createEmbedding(textToEmbed);
    await storeChunk({
      content: textToEmbed,
      embedding,
      level: note.level ?? null,
      sourceType: 'note',
      sourceId: note.id,
      chapterTitle: note.chapterTitle,
      subtopicTitle: note.subtopicTitle,
    });
    stored++;
  }

  return stored;
}

export async function buildContext(
  userMessage: string,
  level?: string | null,
): Promise<string> {
  const queryEmbedding = await createEmbedding(userMessage);
  const chunks = await searchSimilarChunks(queryEmbedding, level);

  if (chunks.length === 0) {
    return '';
  }

  const contextParts = chunks.map((c) => {
    const source =
      c.chapter_title && c.subtopic_title
        ? `[${c.chapter_title} > ${c.subtopic_title}]`
        : c.chapter_title
          ? `[${c.chapter_title}]`
          : '[Study Material]';
    return `${source}\n${c.content}`;
  });

  return contextParts.join('\n\n---\n\n');
}
