import { createEmbedding, searchSimilarChunks, storeChunk, deleteChunksBySourceId } from './knowledge-store';
export { deleteChunksBySourceId };

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;

// Marker tokens used to keep image URLs tied to their surrounding text through
// the stripHtml + word-chunking pipeline. URLs contain no spaces, so each marker
// survives as a single "word" and stays in the chunk where the image appeared.
const IMG_MARKER = /⟦IMG:(.*?)⟧/g;

// Replace each <img> tag with a space-free marker so the image's URL travels
// with the text around it. Tags without a src are dropped.
function replaceImagesWithMarkers(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    return m ? ` ⟦IMG:${m[1]}⟧ ` : ' ';
  });
}

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

// Pull image markers out of a chunk, returning the cleaned text + the image URLs.
function extractChunkImages(chunk: string): { text: string; images: string[] } {
  const images = [...chunk.matchAll(IMG_MARKER)].map((m) => m[1]);
  const text = chunk.replace(IMG_MARKER, ' ').replace(/\s+/g, ' ').trim();
  return { text, images: [...new Set(images)] };
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

  // Keep image URLs inline as markers so they stay with their surrounding text
  const plainText = note.contentHtml
    ? stripHtml(replaceImagesWithMarkers(note.contentHtml))
    : '';
  if (!plainText || plainText.length < 50) return 0;

  const headerContext = `[${note.chapterTitle ?? ''}${note.subtopicTitle ? ' > ' + note.subtopicTitle : ''}] ${note.title}: `;
  const chunks = chunkText(plainText);
  let stored = 0;

  for (const chunk of chunks) {
    const { text, images } = extractChunkImages(chunk);
    // Skip chunks that became empty after removing image markers
    if (text.length < 20) continue;

    const textToEmbed = headerContext + text;
    const embedding = await createEmbedding(textToEmbed);
    await storeChunk({
      content: textToEmbed,
      embedding,
      level: note.level ?? null,
      sourceType: 'note',
      sourceId: note.id,
      chapterTitle: note.chapterTitle,
      subtopicTitle: note.subtopicTitle,
      imageUrls: images,
    });
    stored++;
  }

  return stored;
}

export type RagImage = { url: string; label: string };

export type RagContext = {
  text: string;
  images: RagImage[];
};

export async function buildContext(
  userMessage: string,
  level?: string | null,
): Promise<RagContext> {
  const queryEmbedding = await createEmbedding(userMessage);
  const chunks = await searchSimilarChunks(queryEmbedding, level);

  if (chunks.length === 0) {
    return { text: '', images: [] };
  }

  const contextParts: string[] = [];
  const images: RagImage[] = [];
  const seenUrls = new Set<string>();

  for (const c of chunks) {
    const source =
      c.chapter_title && c.subtopic_title
        ? `[${c.chapter_title} > ${c.subtopic_title}]`
        : c.chapter_title
          ? `[${c.chapter_title}]`
          : '[Study Material]';
    contextParts.push(`${source}\n${c.content}`);

    // Collect images from the most relevant chunks, labelled by their topic
    for (const url of c.image_urls ?? []) {
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      const label = c.subtopic_title ?? c.chapter_title ?? 'Study material diagram';
      images.push({ url, label });
    }
  }

  return { text: contextParts.join('\n\n---\n\n'), images };
}
