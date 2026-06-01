import { NextResponse } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai, CHAT_MODEL } from '@/lib/ai/openai';
import { buildContext } from '@/lib/ai/rag';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Level I',
  LEVEL_2: 'Level II',
  LEVEL_3: 'Level III',
};

function buildSystemPrompt(level: string | null, context: string, qaPairs: { question: string; answer: string }[] = []): string {
  const levelLabel = level ? LEVEL_LABELS[level] ?? level : 'all levels';

  const base = `You are Chartix AI — a friendly CMT exam tutor helping students prepare for CMT ${levelLabel}. Students may be from anywhere in the world and may be beginners.

ALWAYS reply in EXACTLY this structure — no exceptions:

---
**What is [topic]?**
[One plain English sentence. No jargon.]

**Key Principles:**

1. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]
   - [supporting detail if needed]

2. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]

[continue numbering for all points]

**📌 Real-World Example:**
[A concrete, easy-to-visualise example using a real market scenario. Use global examples — US, UK, Indian, or any major market depending on context.]

**💡 Exam Tip:**
[One line on what CMT exams specifically test about this topic.]
---

RULES YOU MUST NEVER BREAK:
- Main points are ALWAYS numbered (1. 2. 3.) — NEVER use bold text as a heading/point
- **Bold** is ONLY used for the point name inside the numbered line
- Sub-details use "- " bullet under the numbered point
- Keep answers focused and exam-relevant
- Do NOT make up facts — if unsure, say so

IMPORTANT: Do NOT make up facts. If unsure, say so clearly.`;

  let prompt = base;

  // Inject admin corrections with highest priority
  if (qaPairs.length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY CORRECTIONS — use these EXACT answers (highest priority, overrides everything):
${qaPairs.map((p, i) => `${i + 1}. Q: ${p.question}\n   A: ${p.answer}`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  if (context) {
    return `${prompt}

Here is relevant content from the student's study materials to inform your answer:

${context}

Use this context as your primary source. You may supplement with your general CMT knowledge, but always stay grounded in the curriculum.`;
  }

  return prompt;
}

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    // TODO: Uncomment this when payment system is live
    // if (!user.isPremium && user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { success: false, error: { message: 'Chartix AI is available for premium members. Upgrade to get unlimited access.' } },
    //     { status: 403 },
    //   );
    // }

    const body = await request.json();
    const message: string = body.message?.trim();
    const level: string | null = body.level ?? null;
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: { message: 'Message is required' } },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: { message: 'Message too long (max 2000 characters)' } },
        { status: 400 },
      );
    }

    // Build RAG context + load admin Q&A corrections in parallel
    const [context, qaPairs] = await Promise.all([
      buildContext(message, level),
      prisma.botQAPair.findMany({
        where: { botType: 'study' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const systemPrompt = buildSystemPrompt(level, context, qaPairs);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 1200,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: 'Sign in to use Chartix AI' } },
        { status: 401 },
      );
    }
    console.error('[chat/route] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong. Please try again.' } },
      { status: 500 },
    );
  }
}
