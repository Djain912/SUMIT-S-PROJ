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

    const systemPrompt = `You are a senior CMT (Chartered Market Technician) exam question writer with 15+ years of experience writing questions for the official CMT examination. You write questions that appear on the actual CMT ${levelLabel} exam.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no extra text:
{
  "questions": [
    {
      "prompt": "Full question text",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctIndex": 0,
      "difficulty": "EASY",
      "explanation": "Clear explanation of why the correct answer is right, and why each wrong answer is incorrect."
    }
  ]
}

QUESTION TYPE DISTRIBUTION — for every 10 questions, write exactly:
- 4 SCENARIO-BASED: A real market situation is described, student must apply the concept. Example: "A trader notices the S&P 500 made a new high yesterday but the Dow Transportation Average failed to confirm. According to Dow Theory, this MOST likely indicates..."
- 3 APPLICATION: Student must decide what action to take or what an indicator signal means in practice. Example: "An analyst sees RSI at 78 on a weekly chart. Which of the following is the MOST appropriate interpretation?"
- 2 CONCEPTUAL: Tests understanding of WHY something works, not just WHAT it is. Example: "Which of the following BEST explains why volume is considered to confirm price trends?"
- 1 FORMULA/DEFINITION: Tests recall of a key formula, calculation step, or precise definition that a CMT candidate must know. Example: "Which of the following correctly describes how the MACD line is calculated?" or "The look-back period used in a standard RSI calculation is:"

PROHIBITIONS:
- Simple true/false disguised as MCQ
- Questions where one option is obviously wrong to anyone who read the topic

DIFFICULTY — the "difficulty" field must be EXACTLY one of these three strings only:
- "EASY" (30%): Straightforward application, one-step reasoning
- "MEDIUM" (40%): Requires connecting two concepts or interpreting a market scenario
- "HARD" (30%): Multi-step reasoning, conflicting signals, or nuanced market judgment calls

IMPORTANT: "difficulty" is SEPARATE from question type. Never put SCENARIO, APPLICATION, CONCEPTUAL, or FORMULA in the difficulty field. Only EASY, MEDIUM, or HARD.

QUALITY STANDARDS:
1. Exactly 4 options — no "All of the above" or "None of the above"
2. All 3 wrong answers must be plausible — common real-world mistakes or misconceptions
3. correctIndex is 0, 1, 2, or 3
4. Each question tests a DIFFERENT concept or angle — no repetition
5. Use real markets in scenarios: equities, commodities, forex, indices (Nifty, S&P 500, crude oil, etc.)
6. Explanation must explain WHY correct is correct AND why each wrong answer is wrong (2-4 sentences)`;

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

    const VALID_DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

    for (const q of validQuestions) {
      const correctIdx = Math.max(0, Math.min(q.options.length - 1, q.correctIndex));
      // GPT sometimes returns question-type labels (CONCEPTUAL, SCENARIO, etc.) instead of
      // difficulty labels — sanitise to only allow EASY / MEDIUM / HARD.
      const difficulty = VALID_DIFFICULTIES.has(q.difficulty) ? q.difficulty : 'MEDIUM';

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
          difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
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
