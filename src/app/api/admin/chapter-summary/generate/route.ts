import { NextResponse } from 'next/server';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { validateCsrfOrigin } from '@/server/policies/csrf';
import { prisma } from '@/lib/db/prisma';
import { openai } from '@/lib/ai/openai';
import { normalizeSummary } from '@/lib/chapter-summary/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // AI generation can take a while

const SYSTEM_PROMPT = `You are a CMT (Chartered Market Technician) Charterholder and experienced market practitioner who has already passed all three CMT exams. You help serious CMT candidates revise by producing a Quick Revision Sheet for a chapter — the notes a student wants to read if they only have 5–10 minutes before the exam.

Extract and summarize ONLY the highest-value, most testable information. Do not rewrite the whole chapter. Prioritize exam relevance over completeness. Merge overlapping concepts. Eliminate low-probability detail. If a concept is foundational or historically tested, prioritize it even if small in the source.

Writing style: natural, practical, professional but not academic, concise, high signal, plain English, focus on understanding not rote memorization, no fluff, no repetition. Never say "according to the notes" or mention that anything was summarized.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, exactly this shape:
{
  "summary": ["5-10 short bullet strings — the most important chapter takeaways"],
  "keyConcepts": [
    { "name": "Concept name", "definition": "one-line definition", "whyItMatters": "why it matters in plain English", "examAngle": "the common exam angle / how it's tested" }
  ],
  "formulas": [
    { "label": "Formula name", "expression": "the formula", "notes": "variable definitions + interpretation + common trap if any" }
  ],
  "examTips": [
    { "remember": "✅ what to remember", "mistake": "❌ the common mistake / distractor candidates fall for" }
  ],
  "highYield": ["short factual bullets: rules, thresholds, characteristics, assumptions, relationships commonly tested"],
  "oneMinute": ["10-15 ultra-short bullets capturing the entire chapter, readable in under 60 seconds"]
}

Rules:
- If the chapter has NO formulas, return "formulas": [].
- keyConcepts: include the most testable concepts only (typically 4-8).
- examTips: 3-6 high-value pairs.
- Keep every string tight. No numbering prefixes (the UI numbers them).`;

type Generated = {
  summary?: string[];
  keyConcepts?: { name: string; definition: string; whyItMatters: string; examAngle: string }[];
  formulas?: { label: string; expression: string; notes?: string }[];
  examTips?: { remember: string; mistake: string }[];
  highYield?: string[];
  oneMinute?: string[];
};

export async function POST(request: Request) {
  try {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid origin' } }, { status: 403 });
    }
    await requireAdminUser();

    const { chapterId } = await request.json() as { chapterId?: string };
    if (!chapterId) {
      return NextResponse.json({ success: false, error: { message: 'chapterId required' } }, { status: 400 });
    }

    // Pull the chapter + all published notes across its subtopics.
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        title: true,
        level: true,
        subtopics: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
          select: {
            title: true,
            notes: {
              where: { isPublished: true, isDeleted: false },
              orderBy: { orderIndex: 'asc' },
              select: { title: true, contentHtml: true },
            },
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ success: false, error: { message: 'Chapter not found' } }, { status: 404 });
    }

    let sourceText = '';
    for (const st of chapter.subtopics) {
      for (const note of st.notes) {
        const plain = (note.contentHtml ?? '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        if (plain) sourceText += `\n\n## ${st.title} — ${note.title}\n${plain}`;
      }
    }

    sourceText = sourceText.trim().slice(0, 60000); // keep prompt within budget

    if (!sourceText) {
      return NextResponse.json(
        { success: false, error: { message: 'This chapter has no published notes to summarize yet.' } },
        { status: 400 },
      );
    }

    const levelLabel = chapter.level.replace('_', ' ').replace('LEVEL', 'Level');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CMT ${levelLabel} — Chapter: "${chapter.title}"\n\nChapter notes:\n${sourceText}\n\nProduce the Quick Revision Sheet JSON now.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    let parsed: Generated;
    try {
      parsed = JSON.parse(content) as Generated;
    } catch {
      return NextResponse.json({ success: false, error: { message: 'AI returned malformed output, please retry.' } }, { status: 502 });
    }

    // Normalize into our canonical shape before returning.
    const data = normalizeSummary({
      summary: parsed.summary,
      keyConcepts: parsed.keyConcepts,
      formulas: parsed.formulas,
      examTips: parsed.examTips,
      highYield: parsed.highYield,
      oneMinute: parsed.oneMinute,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Admin only' } }, { status: 401 });
    }
    console.error('[chapter-summary generate]', error);
    return NextResponse.json({ success: false, error: { message: 'Generation failed, please retry.' } }, { status: 500 });
  }
}
