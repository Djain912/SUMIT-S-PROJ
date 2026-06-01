import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_BASE = `You are the CMT Exam Info Assistant on Chartix.in — a friendly, concise guide for people curious about the CMT (Chartered Market Technician) designation and exam.

WHAT YOU ANSWER:
• CMT exam structure — how many levels, what each level covers, topic weightings
• CMT curriculum chapters and key subject areas per level
• Exam format — question count, duration, passing scores, exam windows
• Eligibility and experience requirements for the CMT charter
• Registration process, exam fees, scheduling
• Career paths and job roles for CMT charterholders
• Differences between CMT and other designations (CFA, CFTe, etc.)
• CMT Association membership and benefits

WHAT YOU DECLINE (with a helpful redirect):
• Concept explanations like "What is RSI?", "Explain Dow Theory", "How does MACD work?"
• Study help or question-solving
• Anything unrelated to the CMT examination process

DECLINE TEMPLATE (use exactly this when declining):
"I'm the CMT Exam Info Assistant — I can tell you about exam structure, fees, eligibility, and careers. For concept explanations and practice questions, sign up at chartix.in — we have full CMT study notes and 1000+ practice questions! 🎓"

TONE: Friendly, direct, and concise. Use bullet points for lists. Keep responses under 200 words. Do not make up facts — if you don't know something, say so and suggest checking the official CMT Association website (cmtassociation.org).`;

function buildSystemPrompt(context: string, qaPairs: { question: string; answer: string }[]): string {
  let prompt = SYSTEM_BASE;

  // Inject admin-written Q&A corrections (highest priority — always use these)
  if (qaPairs.length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY FACTS — use these EXACT answers for these questions (highest priority):
${qaPairs.map((p, i) => `${i + 1}. Q: ${p.question}\n   A: ${p.answer}`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  if (!context.trim()) return prompt;

  return `${prompt}

───────────────────────────────────────
OFFICIAL CMT INFORMATION (use as your primary source):

${context.slice(0, 55000)}
───────────────────────────────────────

Always ground your answers in the above material. You may supplement with general CMT knowledge but stay factual.`;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  try {
    // Rate limit: 15 messages per IP per hour
    const rl = await enforceRateLimit({
      request,
      key: 'public-chat',
      maxRequests: 15,
      windowMs: 60 * 60 * 1000,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `You've reached the message limit. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`,
          },
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const message: string = (body.message as string | undefined)?.trim() ?? '';
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-6) : [];

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: { message: 'Message is required' } },
        { status: 400 },
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: { message: 'Message too long (max 500 characters)' } },
        { status: 400 },
      );
    }

    // Load knowledge sources + admin Q&A corrections in parallel
    const [sources, qaPairs] = await Promise.all([
      prisma.publicBotSource.findMany({
        select: { type: true, name: true, content: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.botQAPair.findMany({
        where: { botType: 'public' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const context = sources
      .map((s) => `[Source: ${s.name}]\n${s.content}`)
      .join('\n\n---\n\n');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // cheaper for public, no auth required
      messages: [
        { role: 'system', content: buildSystemPrompt(context, qaPairs) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 450,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
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
    console.error('[public-chat] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong. Please try again.' } },
      { status: 500 },
    );
  }
}
