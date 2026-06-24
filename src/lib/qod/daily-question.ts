import { prisma } from '@/lib/db/prisma';
import type { QuizQuestion } from '@/components/marketing/QuizWidget';

// Server-safe text extractor — no DOM/DOMPurify needed here (public page, read-only display)
function tiptapToText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text') return n.text ?? '';
  return (n.content ?? []).map(tiptapToText).join(' ');
}

function jsonToText(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (typeof input !== 'object') return '';
  const obj = input as { html?: string; type?: string };
  if (typeof obj.html === 'string') return obj.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (obj.type === 'doc') return tiptapToText(input).replace(/\s+/g, ' ').trim();
  return '';
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export async function getDailyQuestion(): Promise<QuizQuestion | null> {
  try {
    const total = await prisma.question.count({
      where: {
        isPublished: true,
        isDeleted: false,
        level: 'LEVEL_1',
        questionType: 'SINGLE_CHOICE',
      },
    });

    if (total === 0) return null;

    // UTC day index — same question all day, rotates at midnight UTC
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const skip = dayIndex % total;

    const q = await prisma.question.findFirst({
      where: {
        isPublished: true,
        isDeleted: false,
        level: 'LEVEL_1',
        questionType: 'SINGLE_CHOICE',
      },
      include: {
        options: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
    });

    if (!q || q.options.length < 2) return null;

    const questionText = jsonToText(q.promptJson);
    if (!questionText) return null;

    const correctIndex = q.options.findIndex((o) => o.isCorrect);
    if (correctIndex === -1) return null;

    const explanation = q.explanationJson
      ? jsonToText(q.explanationJson)
      : 'Refer to your CMT Level 1 notes for a detailed explanation of this concept.';

    return {
      question: questionText,
      options: q.options.map((o, i) => ({
        label: OPTION_LABELS[i] ?? String(i + 1),
        text: jsonToText(o.contentJson),
      })),
      correctIndex,
      explanation: explanation || 'Refer to your CMT Level 1 notes for a detailed explanation.',
    };
  } catch {
    return null;
  }
}
