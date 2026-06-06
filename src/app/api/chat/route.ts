import { NextResponse, after } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { openai, CHAT_MODEL } from '@/lib/ai/openai';
import { buildContext, type RagImage } from '@/lib/ai/rag';
import { getUserMemory, updateUserMemory } from '@/lib/ai/memory';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Level I',
  LEVEL_2: 'Level II',
  LEVEL_3: 'Level III',
};

function buildSystemPrompt(
  level: string | null,
  context: string,
  qaPairs: { question: string; answer: string }[] = [],
  images: RagImage[] = [],
  memory: string | null = null,
): string {
  const levelLabel = level ? LEVEL_LABELS[level] ?? level : 'all levels';

  const base = `You are Chartix AI — a friendly CMT exam tutor helping students prepare for CMT ${levelLabel}. Students may be from anywhere in the world and may be beginners.

ALWAYS reply in EXACTLY this structure — no exceptions:

---
**What is [topic]?**
[One plain English sentence. No jargon.]

[DIAGRAM SLOT: If the "DIAGRAMS AVAILABLE" section below lists a diagram that fits this topic, embed it right here on its own line as ![short caption](url), then add one line explaining what it shows. Omit this slot ONLY when no diagram is provided below or none relate to the topic.]

**Key Principles:**

1. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]
   - [supporting detail if needed]

2. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]

[continue numbering for all points]

**Real-World Example**
[A concrete, easy-to-visualise example using a real market scenario. Use global examples — US, UK, Indian, or any major market depending on context.]

**Exam Tips**
- [A specific, high-value pointer on how the CMT exam tests this — e.g. a definition examiners expect, a key threshold/number to memorise, or the precise distinction they probe.]
- [A common trap, misconception, or look-alike concept students confuse this with.]
- [What to focus revision on, or how the question is typically framed (calculation, identification, interpretation).]
---

RULES YOU MUST NEVER BREAK:
- Main points are ALWAYS numbered (1. 2. 3.) — NEVER use bold text as a heading/point
- **Bold** is ONLY used for the point name inside the numbered line
- Sub-details use "- " bullet under the numbered point
- "Exam Tips" must be 2–3 genuinely useful, exam-specific bullet points — never generic filler like "practice a lot" or "understand the concept".
- Do NOT use emojis anywhere in the answer. Keep it clean and professional.
- Keep answers focused and exam-relevant
- Do NOT make up facts — if unsure, say so

IMPORTANT: Do NOT make up facts. If unsure, say so clearly.`;

  // Diagrams pulled from the student's own notes — let the model embed the
  // relevant one(s) inline using markdown image syntax, which the UI renders.
  const imagesSection =
    images.length > 0
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGRAMS AVAILABLE FROM THE STUDENT'S NOTES — each is listed as "description — url":
${images.map((img, i) => `${i + 1}. ${img.label} — ${img.url}`).join('\n')}

HOW TO CHOOSE A DIAGRAM (read carefully — showing the WRONG diagram is worse than showing none):
- Read each diagram's description and pick the ONE whose description specifically matches the exact concept the student asked about.
- If a description clearly matches, embed it in the DIAGRAM SLOT on its own line using EXACTLY: ![description](url) — use the matching diagram's own description as the caption.
- If NONE of the descriptions specifically match the concept asked about, do NOT include any image. Never show a loosely-related or unrelated diagram just to have one.
- Use ONLY the exact URLs listed above — copy them character-for-character. NEVER invent, guess, shorten, or modify a URL, and never pair a description with a different image's URL.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '';

  // Personalisation profile built up from this student's past chats.
  const memorySection = memory
    ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU KNOW ABOUT THIS STUDENT (adapt your depth, tone and format to match — do NOT mention that you have a profile):
${memory}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : '';

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
    prompt += `

Here is relevant content from the student's study materials to inform your answer:

${context}

Use this context as your primary source. You may supplement with your general CMT knowledge, but always stay grounded in the curriculum.`;
  }

  return prompt + imagesSection + memorySection;
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

    // Build RAG context + load admin Q&A corrections + student memory in parallel
    const [context, qaPairs, memory] = await Promise.all([
      buildContext(message, level),
      prisma.botQAPair.findMany({
        where: { botType: 'study' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      getUserMemory(user.id),
    ]);

    const systemPrompt = buildSystemPrompt(level, context.text, qaPairs, context.images, memory);

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
        let fullAnswer = '';
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
          // Update the student's learning profile after responding, without
          // blocking the stream. Runs on the cheap memory model.
          if (fullAnswer.trim().length > 0) {
            after(updateUserMemory(user.id, message, fullAnswer));
          }
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
