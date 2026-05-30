import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { prisma } from '@/lib/db/prisma';
import { openai } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — AI generation takes time

// Reuse same pdf-parse loader pattern already in the codebase
const _require = createRequire(import.meta.url);
type PdfParseFunc = (buffer: Buffer) => Promise<{ text: string }>;
const pdfParse = _require('pdf-parse') as PdfParseFunc;

type RawQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation: string;
};

async function generateBatch(
  systemPrompt: string,
  userPrompt: string,
  count: number,
): Promise<RawQuestion[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.75,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userPrompt}\n\nGenerate exactly ${count} unique questions now. Return only the JSON.`,
      },
    ],
  });

  try {
    const content = response.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { questions?: RawQuestion[] };
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();

    const formData = await request.formData();
    const subtopicId = (formData.get('subtopicId') as string | null)?.trim();
    const chapterId = (formData.get('chapterId') as string | null)?.trim();
    const level = (formData.get('level') as string | null)?.trim();
    const rawCount = parseInt((formData.get('count') as string | null) ?? '50', 10);
    const count = Math.min(100, Math.max(5, isNaN(rawCount) ? 50 : rawCount));
    const pdfFile = formData.get('pdf') as File | null;

    if (!subtopicId || !chapterId || !level) {
      return NextResponse.json(
        { success: false, error: { message: 'subtopicId, chapterId and level are required' } },
        { status: 400 },
      );
    }

    // Fetch subtopic + chapter + published notes
    const subtopic = await prisma.subtopic.findUnique({
      where: { id: subtopicId },
      include: {
        chapter: { select: { title: true } },
        notes: {
          where: { isPublished: true, isDeleted: false },
          select: { title: true, contentHtml: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!subtopic) {
      return NextResponse.json(
        { success: false, error: { message: 'Subtopic not found' } },
        { status: 404 },
      );
    }

    // Build source text from existing notes
    let sourceText = '';
    for (const note of subtopic.notes) {
      const plain = (note.contentHtml ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (plain) sourceText += `\n\n### ${note.title}\n${plain}`;
    }

    // Extract text from all uploaded PDFs (up to 10)
    const pdfFiles: File[] = [];
    // Support both single 'pdf' key and indexed 'pdf_0', 'pdf_1', ... keys
    if (pdfFile && pdfFile.size > 0) pdfFiles.push(pdfFile);
    for (let i = 0; i < 10; i++) {
      const f = formData.get(`pdf_${i}`) as File | null;
      if (f && f.size > 0) pdfFiles.push(f);
    }
    const perFileCap = Math.floor(20000 / Math.max(1, pdfFiles.length)); // share token budget
    for (const f of pdfFiles) {
      const buffer = Buffer.from(await f.arrayBuffer());
      const pdf = await pdfParse(buffer);
      sourceText += `\n\n### PDF: ${f.name}\n${pdf.text.slice(0, perFileCap)}`;
    }

    const levelLabel = level.replace('_', ' ').replace('LEVEL', 'Level');

    const systemPrompt = `You are a senior CMT (Chartered Market Technician) exam question writer. You create rigorous, high-quality MCQ questions that match the exact style, depth, and difficulty of the official CMT examination.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no extra text:
{
  "questions": [
    {
      "prompt": "Full question text (can be a scenario + question)",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctIndex": 0,
      "difficulty": "EASY",
      "explanation": "2-3 sentences explaining why the correct answer is right AND briefly why each wrong answer is incorrect."
    }
  ]
}

STRICT RULES:
1. Exactly 4 options per question — no more, no less
2. correctIndex is 0, 1, 2, or 3 (index into the options array)
3. Difficulty distribution: ~30% EASY, ~40% MEDIUM, ~30% HARD
4. Questions MUST test conceptual understanding and real-world application — NOT just definitions or rote memorization
5. Include market scenario questions: "Given that X is happening in the market, which statement about Y is MOST accurate?"
6. Match CMT ${levelLabel} exam standards — technical precision, industry terminology, exam-style phrasing
7. Explanation must be specific — cite the concept, explain why distractors are wrong
8. Do NOT repeat similar questions — each question must test a distinct concept or angle
9. Options must be plausible — wrong answers should be common misconceptions, not obviously wrong`;

    const userPrompt = `Generate CMT ${levelLabel} exam MCQ questions for:
Topic: "${subtopic.title}"
Chapter: "${subtopic.chapter.title}"

${sourceText
  ? `Base your questions on this study material:\n${sourceText}`
  : `Use your knowledge of "${subtopic.title}" as it appears in the CMT ${levelLabel} curriculum.`
}`;

    // Generate in batches of 25 to stay within token limits
    const BATCH_SIZE = 25;
    const allRaw: RawQuestion[] = [];
    const batches = Math.ceil(count / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const batchCount = Math.min(BATCH_SIZE, count - allRaw.length);
      if (batchCount <= 0) break;
      const batch = await generateBatch(systemPrompt, userPrompt, batchCount);
      allRaw.push(...batch);
    }

    // Save all valid questions to DB (unpublished — admin reviews first)
    let created = 0;
    const validQuestions = allRaw
      .slice(0, count)
      .filter(
        (q) =>
          q.prompt?.trim() &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctIndex === 'number',
      );

    for (const q of validQuestions) {
      const correctIdx = Math.max(0, Math.min(q.options.length - 1, q.correctIndex));
      await prisma.question.create({
        data: {
          level: level as 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3',
          chapterId,
          subtopicId,
          promptJson: { html: `<p>${q.prompt.trim()}</p>` },
          explanationJson: q.explanation?.trim()
            ? { html: `<p>${q.explanation.trim()}</p>` }
            : undefined,
          questionType: 'SINGLE_CHOICE',
          difficulty: q.difficulty ?? 'MEDIUM',
          isPublished: false, // admin must review and publish manually
          createdById: user.id,
          updatedById: user.id,
          options: {
            create: q.options.map((optText: string, idx: number) => ({
              contentJson: { html: String(optText).trim() },
              isCorrect: idx === correctIdx,
              orderIndex: idx,
            })),
          },
        },
      });
      created++;
    }

    return NextResponse.json({ success: true, data: { created, requested: count } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: 401 },
      );
    }
    console.error('[generate-questions] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to generate questions. Please try again.' } },
      { status: 500 },
    );
  }
}
