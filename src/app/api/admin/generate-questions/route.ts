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
    temperature: 0.85,
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
    const rawCount = parseInt((formData.get('count') as string | null) ?? '30', 10);
    const count = Math.min(100, Math.max(5, isNaN(rawCount) ? 30 : rawCount));
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

    const systemPrompt = `You are a senior CMT (Chartered Market Technician) exam question writer with 15+ years of experience creating questions for the official CMT Level I, II, and III examinations. Your questions appear on real CMT exams. Every question you write must be publication-ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — return ONLY valid JSON, no markdown, no extra text:
{
  "questions": [
    {
      "prompt": "Full question text here",
      "options": ["Option A — complete statement", "Option B — complete statement", "Option C — complete statement", "Option D — complete statement"],
      "correctIndex": 0,
      "difficulty": "EASY",
      "explanation": "Correct: [reason the answer is right]. Wrong A: [why this is incorrect]. Wrong B: [why this is incorrect]. Wrong C: [why this is incorrect]."
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION TYPE DISTRIBUTION — for every 10 questions generate:
• 4 SCENARIO-BASED — Describe a specific real market situation with concrete details (index name, indicator value, timeframe, price pattern). Student must apply knowledge.
  ✅ Good: "The Nifty 50 makes a new all-time high on Monday, but the Advance-Decline line for the NSE falls sharply the same day. According to breadth analysis, this MOST likely signals..."
  ❌ Bad: "A market makes a new high. What does this mean?"

• 3 APPLICATION — Student must interpret what an indicator/signal means in practice or decide what action to take.
  ✅ Good: "An analyst observes RSI at 76 on a weekly chart while price prints a lower high. The MOST appropriate interpretation is..."
  ❌ Bad: "What is RSI used for?"

• 2 CONCEPTUAL — Tests understanding of WHY a concept works, its limitations, or how it compares to a related concept.
  ✅ Good: "Which of the following BEST explains why Dow Theory requires both the Industrial and Transportation averages to confirm a trend?"
  ❌ Bad: "Which two averages does Dow Theory use?"

• 1 FORMULA/CALCULATION — Tests precise recall of a formula, input values, calculation steps, or a specific numerical fact from the CMT curriculum.
  ✅ Good: "Which of the following correctly describes the inputs used to calculate the Average True Range (ATR)?"
  ❌ Bad: "What does ATR stand for?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIFFICULTY — use EXACTLY these strings:
• "EASY" (30%): Tests specific factual knowledge a candidate who studied the material knows immediately. EASY does NOT mean common sense or general knowledge — it must require having studied the topic.
  ✅ Good EASY: "According to Dow Theory, which condition must be met before a primary trend change is confirmed?"
  ❌ Bad EASY: "What is plotted on the vertical axis of a chart?" (anyone knows this without studying)

• "MEDIUM" (40%): Requires connecting two concepts, interpreting a market scenario, or choosing between two plausible answers that both sound correct.

• "HARD" (30%): Multi-step reasoning, conflicting signals, edge cases, or nuanced judgment where even well-prepared candidates must think carefully.

IMPORTANT: "difficulty" must be only EASY, MEDIUM, or HARD — never SCENARIO, APPLICATION, CONCEPTUAL, or FORMULA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-REPETITION RULES — strictly enforced:
1. Every question must test a DIFFERENT specific fact, concept, calculation, or market application
2. Never test the same concept twice — even with different wording or scenario
3. Track all concepts you have already covered within this batch and ensure zero overlap
4. If generating multiple questions about the same topic (e.g., Dow Theory), deliberately cover different sub-concepts: primary trend, secondary reaction, volume confirmation, averages confirmation, line formations, reversal signals — never the same sub-concept twice

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION QUALITY RULES:
1. Exactly 4 options per question — no "All of the above", "None of the above", "Both A and B"
2. Every option must be a COMPLETE, MEANINGFUL STATEMENT — minimum 8 words
  ✅ Good: "The trend is likely to reverse in the short term"
  ❌ Bad: "Higher volume" or "Trend reversal" (too short — not a real option)
3. All 3 wrong options must be genuinely plausible to a student who partially studied the topic — they should reflect real misconceptions, not obvious nonsense
4. correctIndex is 0, 1, 2, or 3 — vary the position of the correct answer across questions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPLANATION RULES:
Follow this exact format (keep under 120 words total):
"Correct: [1 sentence explaining why the answer is right, referencing the specific CMT concept]. Wrong [letter]: [why this is incorrect — reference the specific misconception]. Wrong [letter]: [why this is incorrect]. Wrong [letter]: [why this is incorrect]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL STANDARDS:
• Use real market context in scenarios: Nifty 50, S&P 500, Dow Jones, crude oil, USD/INR, gold, Apple (AAPL), etc.
• Vary question stems: "Which of the following...", "An analyst observes...", "According to [concept]...", "A trader who...", "What is the MOST likely...", "Which statement BEST describes..."
• CMT exam style: stem ends with clear question or instruction; avoid vague stems like "Which is true?"
• Do NOT include the question type label (SCENARIO, APPLICATION, etc.) in the prompt field — questions must read naturally`;

    const userPrompt = `Generate CMT ${levelLabel} exam MCQ questions for:
Topic: "${subtopic.title}"
Chapter: "${subtopic.chapter.title}"

CONCEPT COVERAGE REQUIREMENT: Spread your questions across as many DIFFERENT sub-concepts of this topic as possible. Do not cluster multiple questions around the same sub-concept. Aim for maximum breadth — if the topic has 10 distinct sub-concepts, touch all 10 rather than covering 3 sub-concepts deeply.

${sourceText
  ? `Base your questions strictly on this study material — do not introduce facts not present in the material:\n\n${sourceText}`
  : `Use your expert knowledge of "${subtopic.title}" as it appears in the CMT ${levelLabel} curriculum. Cover all major sub-concepts of this topic.`
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
